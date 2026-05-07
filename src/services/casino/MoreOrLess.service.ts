import axios from 'axios';
import { Collection } from 'discord.js';
import { MoreOrLessGame, TurnResult, DeckApiResponse, DrawApiResponse } from '../../models/casino/MoreOrLessGame.interface';
import { container } from '@sapphire/framework';
import { MoreOrLessMessageBuilder } from '../../builders/casino/MoreOrLessMessage.builder';

export class MoreOrLessService {
	private games = new Collection<string, MoreOrLessGame>();
	private challenges = new Collection<string, MoreOrLessGame>();

	private deckApi = axios.create({
		baseURL: 'https://deckofcardsapi.com/api/deck',
		timeout: 5000
	});

	private readonly TURN_TIME_LIMIT = 30000;

	// =========================================================
	// UTILITAIRES
	// =========================================================

	/**
	 * Convertit une valeur de carte API en nombre
	 */
	private parseCardValue(value: string): number {
		const map: Record<string, number> = {
			ACE: 14,
			KING: 13,
			QUEEN: 12,
			JACK: 11
		};
		return map[value] ?? parseInt(value, 10);
	}

	// =========================================================
	// DECK
	// =========================================================

	/**
	 * Initialise un deck + tire la première carte
	 */
	public async initDeckAndDraw() {
		try {
			const deck = await this.deckApi.get<DeckApiResponse>('/new/shuffle/?deck_count=1');
			const draw = await this.deckApi.get<DrawApiResponse>(`/${deck.data.deck_id}/draw/?count=1`);

			const raw = draw.data.cards[0];

			return {
				deckId: deck.data.deck_id,
				totalCards: deck.data.remaining,
				remainingCards: draw.data.remaining,
				card: {
					code: raw.code,
					image: raw.image,
					value: this.parseCardValue(raw.value)
				}
			};
		} catch (err) {
			console.error('Deck API error:', err);
			return null;
		}
	}

	/**
	 * Tire une carte
	 */
	public async drawCard(deckId: string) {
		try {
			const res = await this.deckApi.get<DrawApiResponse>(`/${deckId}/draw/?count=1`);
			if (res.data.remaining === 0) return null;

			const raw = res.data.cards[0];

			return {
				card: {
					code: raw.code,
					image: raw.image,
					value: this.parseCardValue(raw.value)
				},
				remaining: res.data.remaining
			};
		} catch (err) {
			console.error('Draw error:', err);
			return null;
		}
	}

	// =========================================================
	// GESTION PARTIES
	// =========================================================

	public registerGame(game: MoreOrLessGame) {
		game.expiresAt = Date.now() + this.TURN_TIME_LIMIT;

		this.games.set(game.messageId, game);
		this.startTurnTimer(game.messageId);
	}

	public getGame(messageId: string) {
		return this.games.get(messageId);
	}

	// =========================================================
	// DÉFIS PvP
	// =========================================================

	public registerChallenge(game: MoreOrLessGame) {
		if (game.challengeMessageId) {
			this.challenges.set(game.challengeMessageId, game);
		}
	}

	public getChallenge(id: string) {
		return this.challenges.get(id);
	}

	public deleteChallenge(id: string) {
		this.challenges.delete(id);
	}

	/**
	 * Accepte un défi
	 */
	public async acceptChallenge(id: string, userId: string) {
		const challenge = this.challenges.get(id);
		if (!challenge) return { success: false, error: 'Défi introuvable.' };

		if (challenge.player2.id !== userId) {
			return { success: false, error: "Ce défi n'est pas pour toi !" };
		}

		const check = await container.economyService.view(userId);
		if (!check.success || check.data.rubies < challenge.bet) {
			return { success: false, error: 'Pas assez de rubis !' };
		}

		const transaction = await container.casinoService.transaction(userId, challenge.bet, 'remove');
		if (!transaction.success) {
			return { success: false, error: 'Erreur de transaction.' };
		}

		challenge.status = 'playing';
		this.challenges.delete(id);

		return { success: true, game: challenge };
	}

	/**
	 * Refuse un défi
	 */
	public async declineChallenge(id: string, userId: string) {
		const challenge = this.challenges.get(id);
		if (!challenge) return { success: false, error: 'Défi introuvable.' };

		if (challenge.player2.id !== userId) {
			return { success: false, error: "Ce défi n'est pas pour toi !" };
		}

		await container.casinoService.transaction(challenge.player1.id, challenge.bet, 'add');

		challenge.status = 'cancelled';
		this.challenges.delete(id);

		return { success: true, game: challenge };
	}

	/**
	 * Annule un défi (timeout)
	 */
	public async cancelChallenge(id: string) {
		const challenge = this.challenges.get(id);
		if (!challenge) return;

		await container.casinoService.transaction(challenge.player1.id, challenge.bet, 'add');

		challenge.status = 'cancelled';
		this.challenges.delete(id);
	}

	// =========================================================
	// JEU
	// =========================================================

	/**
	 * Lance un tour de jeu
	 */
	public async playTurn(messageId: string, userId: string, choice: 'more' | 'less'): Promise<TurnResult> {
		const game = this.games.get(messageId);

		if (!game) return { status: 'error', message: 'Partie introuvable.' };
		if (game.currentTurnId !== userId) return { status: 'error', message: "Ce n'est pas ton tour." };

		const previous = game.currentCard.value;

		const draw = await this.drawCard(game.deckId);
		if (!draw) return { status: 'error', message: 'Plus de cartes.' };

		const newCard = draw.card;
		game.remainingCards = draw.remaining;
		game.currentCard = newCard;

		const isCorrect = (choice === 'more' && newCard.value > previous) || (choice === 'less' && newCard.value < previous);

		game.lastTurnHistory = {
			playerId: userId,
			choice,
			previousValue: previous,
			newValue: newCard.value,
			success: isCorrect,
			timestamp: Date.now()
		};

		// Mauvaise réponse → perte de vie
		if (!isCorrect) {
			const player = game.player1.id === userId ? game.player1 : game.player2;
			player.lives--;

			if (player.lives <= 0) {
				const end = await this.processEndGame(game, userId);
				return { ...end, drawnCard: newCard, choice };
			}
		}

		// Changement de joueur
		game.currentTurnId = game.player1.id === userId ? game.player2.id : game.player1.id;

		return { status: 'continue', game, drawnCard: newCard, choice };
	}

	/**
	 * Termine une partie
	 */
	private async processEndGame(game: MoreOrLessGame, loserId: string): Promise<TurnResult> {
		game.status = 'finished';
		this.games.delete(game.messageId);

		const winnerId = game.player1.id === loserId ? game.player2.id : game.player1.id;
		const isPvP = game.player2.id !== 'bot';

		// 1. Paiement du gagnant (si ce n'est pas le bot)
		let payout = 0;
		if (winnerId !== 'bot') {
			payout = game.bet * 2; // Le gagnant remporte la mise totale (sa mise + celle de l'adversaire)
			await container.casinoService.transaction(winnerId, payout, 'add');
		}

		// 2. LOGS POUR LE GAGNANT (S'il est humain)
		if (winnerId !== 'bot') {
			container.casinoService.logGame(winnerId, 'more_or_less', game.bet, payout, {
				result: 'win',
				mode: isPvP ? 'PvP' : 'PvE',
				opponentId: loserId
			});
		}

		// 3. LOGS POUR LE PERDANT (S'il est humain)
		if (loserId !== 'bot') {
			container.casinoService.logGame(loserId, 'more_or_less', game.bet, 0, {
				result: 'lose',
				mode: isPvP ? 'PvP' : 'PvE',
				opponentId: winnerId
			});
		}

		this.scheduleButtonRemoval(game.messageId, game.channelId);

		return { status: 'win', game, winnerId, loserId };
	}

	// =========================================================
	// TIMERS
	// =========================================================

	private startTurnTimer(messageId: string) {
		const game = this.games.get(messageId);
		if (!game || game.currentTurnId === 'bot') return;

		this.clearTimers(game);

		game.turnStartTime = Date.now();
		game.turnTimeLimit = this.TURN_TIME_LIMIT;
		game.expiresAt = Date.now() + this.TURN_TIME_LIMIT;

		game.timer = setTimeout(() => this.handleTimeout(messageId), this.TURN_TIME_LIMIT);
	}

	public clearTimers(game: MoreOrLessGame) {
		if (game.timer) clearTimeout(game.timer);
		if (game.timerWarning) clearTimeout(game.timerWarning);

		game.timer = undefined;
		game.timerWarning = undefined;
	}

	private async handleTimeout(messageId: string) {
		const game = this.games.get(messageId);
		if (!game || game.status !== 'playing') return;

		if (game.expiresAt && Date.now() < game.expiresAt) return;

		const result = await this.processEndGame(game, game.currentTurnId);

		try {
			const channel = await container.client.channels.fetch(game.channelId);
			if (!channel?.isTextBased()) return;

			const message = await channel.messages.fetch(messageId);

			await message.edit(MoreOrLessMessageBuilder.buildEndMessage(result.game!, result.winnerId!, result.loserId!));
		} catch (err) {
			console.error('Timeout error:', err);
		}
	}

	private async scheduleButtonRemoval(messageId: string, channelId: string) {
		setTimeout(async () => {
			try {
				const channel = await container.client.channels.fetch(channelId);
				if (!channel?.isTextBased()) return;

				const message = await channel.messages.fetch(messageId);
				if (!message || message.components.length === 0) return;

				// On ne garde que le premier composant (le Container V2)
				await message.edit({
					components: [message.components[0].toJSON()]
				});
			} catch (err) {
				// Le message a peut-être été supprimé, on ignore l'erreur
			}
		}, 60000); // 1 minute
	}

	// =========================================================
	// BOT
	// =========================================================

	public async handleBotTurn(messageId: string) {
		const game = this.games.get(messageId);
		if (!game || game.currentTurnId !== 'bot') return;

		this.clearTimers(game);

		const value = game.currentCard.value;
		let choice: 'more' | 'less';

		// 1. CAS EXTRÊMES (jamais d'erreur)
		if (value <= 4) {
			choice = 'more';
		} else if (value >= 12) {
			choice = 'less';
		}

		// 2. CAS CLASSIQUES (légère erreur humaine)
		else if (value < 8) {
			choice = Math.random() > 0.1 ? 'more' : 'less';
		} else if (value > 8) {
			choice = Math.random() > 0.1 ? 'less' : 'more';
		}

		// 3. CAS ÉQUILIBRÉ (pile ou face)
		else {
			choice = Math.random() > 0.5 ? 'more' : 'less';
		}

		const result = await this.playTurn(messageId, 'bot', choice);
		if (result.status === 'error') return;

		try {
			const channel = await container.client.channels.fetch(game.channelId);
			if (!channel?.isTextBased()) return;

			const message = await channel.messages.fetch(messageId);

			// 1. Reveal
			await message.edit(MoreOrLessMessageBuilder.buildRevealMessage('bot', choice, result.drawnCard!, result.game!.lastTurnHistory!.success));

			// 2. Suspense
			await new Promise((r) => setTimeout(r, 2500));

			const finished = result.status === 'win';

			if (!finished) this.registerGame(result.game!);

			await message.edit(
				finished
					? MoreOrLessMessageBuilder.buildEndMessage(result.game!, result.winnerId!, result.loserId!)
					: MoreOrLessMessageBuilder.buildGameMessage(result.game!)
			);
		} catch (err) {
			console.error('Bot turn error:', err);
		}
	}
}
