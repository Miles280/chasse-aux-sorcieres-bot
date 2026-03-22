import axios from 'axios';
import { Collection } from 'discord.js';
import { MoreOrLessGame, Card, TurnResult, DeckApiResponse, DrawApiResponse } from '../models/MoreOrLessGame.interface';
import { container } from '@sapphire/framework';
import { MoreOrLessMessageBuilder } from '../builders/MoreOrLessMessage.builder';

export class MoreOrLessService {
	private games = new Collection<string, MoreOrLessGame>();
	private challenges = new Collection<string, MoreOrLessGame>(); // Défis en attente (key = challengeMessageId)

	private deckApi = axios.create({
		baseURL: 'https://deckofcardsapi.com/api/deck',
		timeout: 5000
	});

	private readonly TURN_TIME_LIMIT = 30000; // 30 secondes

	/**
	 * Convertit les noms de cartes en valeurs numériques (As = 14)
	 */
	private parseCardValue(valueStr: string): number {
		const values: Record<string, number> = {
			ACE: 14,
			KING: 13,
			QUEEN: 12,
			JACK: 11
		};
		return values[valueStr] || parseInt(valueStr, 10);
	}

	public async initDeckAndDraw(): Promise<{ deckId: string; card: Card; totalCards: number; remainingCards: number } | null> {
		try {
			const deckRes = await this.deckApi.get<DeckApiResponse>('/new/shuffle/?deck_count=1');
			const drawRes = await this.deckApi.get<DrawApiResponse>(`/${deckRes.data.deck_id}/draw/?count=1`);

			const rawCard = drawRes.data.cards[0];

			return {
				deckId: deckRes.data.deck_id,
				totalCards: deckRes.data.remaining,
				remainingCards: drawRes.data.remaining,
				card: {
					code: rawCard.code,
					image: rawCard.image,
					value: this.parseCardValue(rawCard.value)
				}
			};
		} catch (error) {
			console.error('Erreur API DeckOfCards:', error);
			return null;
		}
	}

	public async drawCard(deckId: string): Promise<{ card: Card; remaining: number } | null> {
		try {
			const res = await this.deckApi.get<DrawApiResponse>(`/${deckId}/draw/?count=1`);

			if (res.data.remaining === 0) return null;

			const rawCard = res.data.cards[0];

			return {
				card: {
					code: rawCard.code,
					image: rawCard.image,
					value: this.parseCardValue(rawCard.value)
				},
				remaining: res.data.remaining
			};
		} catch (error) {
			console.error('Erreur lors de la pioche:', error);
			return null;
		}
	}

	public registerGame(game: MoreOrLessGame) {
		game.expiresAt = Date.now() + this.TURN_TIME_LIMIT; // On fixe l'expiration
		this.games.set(game.messageId, game);
		this.startTurnTimer(game.messageId);
	}

	public getGame(messageId: string) {
		return this.games.get(messageId);
	}

	public registerChallenge(game: MoreOrLessGame) {
		if (game.challengeMessageId) {
			this.challenges.set(game.challengeMessageId, game);
		}
	}

	public getChallenge(challengeMessageId: string) {
		return this.challenges.get(challengeMessageId);
	}

	public deleteChallenge(challengeMessageId: string) {
		this.challenges.delete(challengeMessageId);
	}

	/**
	 * Démarre le timer pour un tour
	 */
	private startTurnTimer(messageId: string) {
		const game = this.games.get(messageId);
		if (!game || game.currentTurnId === 'bot') return;

		this.clearTimers(game);

		// Ces lignes ne feront plus d'erreur
		game.turnStartTime = Date.now();
		game.turnTimeLimit = this.TURN_TIME_LIMIT;
		game.expiresAt = Date.now() + this.TURN_TIME_LIMIT;

		// Timer de fin de tour
		game.timer = setTimeout(async () => {
			await this.handleTimeout(messageId);
		}, this.TURN_TIME_LIMIT);
	}

	/**
	 * Gère le timeout d'un tour
	 */
	private async handleTimeout(messageId: string) {
		const game = this.games.get(messageId);
		if (!game || game.status !== 'playing') return;

		if (game.expiresAt && Date.now() < game.expiresAt) return;

		const loserId = game.currentTurnId;
		const result = await this.processEndGame(game, loserId);

		try {
			const channel = await container.client.channels.fetch(game.channelId);
			if (channel?.isTextBased()) {
				const message = await channel.messages.fetch(messageId);

				// On utilise la méthode de fin qui gère l'embed dynamique (rouge/vert) et les boutons
				const endMessage = MoreOrLessMessageBuilder.buildEndMessage(result.game!, result.winnerId!, result.loserId!);
				await message.edit(endMessage);
			}
		} catch (err) {
			console.error('Erreur gestion timeout:', err);
		}
	}

	/**
	 * Nettoie les timers d'une partie
	 */
	public clearTimers(game: MoreOrLessGame) {
		if (game.timer) {
			clearTimeout(game.timer);
			game.timer = undefined;
		}
		if (game.timerWarning) {
			clearTimeout(game.timerWarning);
			game.timerWarning = undefined;
		}
	}

	/**
	 * Gère la logique d'un tour de jeu
	 */
	public async playTurn(messageId: string, userId: string, choice: 'more' | 'less'): Promise<TurnResult> {
		const game = this.games.get(messageId);
		if (!game) return { status: 'error', message: 'Partie introuvable.' };
		if (game.currentTurnId !== userId) return { status: 'error', message: "Ce n'est pas ton tour." };

		const previousCardValue = game.currentCard.value;

		const drawResult = await this.drawCard(game.deckId);
		if (!drawResult) return { status: 'error', message: 'Plus de cartes disponibles !' };

		const newCard = drawResult.card;
		game.remainingCards = drawResult.remaining; // 👈 MAJ ici

		const newCardValue = newCard.value;
		game.currentCard = newCard;

		const isCorrect = (choice === 'more' && newCardValue > previousCardValue) || (choice === 'less' && newCardValue < previousCardValue);

		game.lastTurnHistory = {
			playerId: userId,
			choice,
			previousValue: previousCardValue,
			newValue: newCardValue,
			success: isCorrect,
			timestamp: Date.now()
		};

		if (!isCorrect) {
			const currentPlayer = game.player1.id === userId ? game.player1 : game.player2;
			currentPlayer.lives--;

			if (currentPlayer.lives <= 0) {
				const endResult = await this.processEndGame(game, userId);
				return { ...endResult, drawnCard: newCard, choice };
			}
		}

		game.currentTurnId = game.player1.id === userId ? game.player2.id : game.player1.id;

		return { status: 'continue', game, drawnCard: newCard, choice };
	}

	/**
	 * Termine la partie et gère les récompenses
	 */
	private async processEndGame(game: MoreOrLessGame, loserId: string): Promise<TurnResult> {
		game.status = 'finished';
		this.games.delete(game.messageId);

		const winnerId = game.player1.id === loserId ? game.player2.id : game.player1.id;

		if (winnerId !== 'bot') {
			await container.casinoService.transaction(winnerId, game.bet * 2, 'add');
		}

		return { status: 'win', game, winnerId, loserId };
	}

	/**
	 * Exécute le tour du bot avec une IA basée sur les probabilités + REVEAL
	 */
	public async handleBotTurn(messageId: string) {
		const game = this.games.get(messageId);
		if (!game || game.currentTurnId !== 'bot') return;

		this.clearTimers(game);

		game.status = 'playing';
		const currentValue = game.currentCard.value;
		let botChoice: 'more' | 'less';

		const median = 8;
		if (currentValue < median) {
			botChoice = Math.random() > 0.1 ? 'more' : 'less';
		} else if (currentValue > median) {
			botChoice = Math.random() > 0.1 ? 'less' : 'more';
		} else {
			botChoice = Math.random() > 0.5 ? 'more' : 'less';
		}

		const result = await this.playTurn(messageId, 'bot', botChoice);
		if (result.status === 'error') return;

		const channel = await container.client.channels.fetch(game.channelId);
		if (channel?.isTextBased()) {
			try {
				const message = await channel.messages.fetch(messageId);
				const success = result.game!.lastTurnHistory!.success;

				// 1. Phase de Reveal
				const revealMessage = MoreOrLessMessageBuilder.buildRevealMessage('bot', botChoice, result.drawnCard!, success);
				await message.edit(revealMessage);

				// 2. Suspense (2.5 secondes)
				await new Promise((r) => setTimeout(r, 2500));

				const isFinished = result.status === 'win';

				// 3. Résultat du tour
				if (!isFinished) {
					this.registerGame(result.game!);
				}

				const finalMessage = isFinished
					? MoreOrLessMessageBuilder.buildEndMessage(result.game!, result.winnerId!, result.loserId!)
					: MoreOrLessMessageBuilder.buildGameMessage(result.game!);

				await message.edit(finalMessage);
			} catch (err) {
				console.error("Impossible d'éditer le message du bot:", err);
			}
		}
	}

	/**
	 * Accepte un défi PvP
	 */
	public async acceptChallenge(
		challengeMessageId: string,
		accepterId: string
	): Promise<{ success: boolean; game?: MoreOrLessGame; error?: string }> {
		const challenge = this.challenges.get(challengeMessageId);
		if (!challenge) return { success: false, error: 'Défi introuvable.' };

		// Vérifier que c'est bien le joueur défié
		if (challenge.player2.id !== accepterId) {
			return { success: false, error: "Ce défi n'est pas pour toi !" };
		}

		// Vérifier l'économie du joueur 2
		const check = await container.economyService.view(accepterId);
		if (!check.success || check.data.rubies < challenge.bet) {
			return { success: false, error: "Le joueur défié n'a pas assez de rubis !" };
		}

		// Débiter le joueur 2
		const transaction = await container.casinoService.transaction(accepterId, challenge.bet, 'remove');
		if (!transaction.success) {
			return { success: false, error: 'Erreur de transaction pour le joueur défié.' };
		}

		// Passer la partie en mode "playing"
		challenge.status = 'playing';

		// Nettoyer le défi
		this.challenges.delete(challengeMessageId);

		return { success: true, game: challenge };
	}

	/**
	 * Refuse un défi PvP
	 */
	public async declineChallenge(
		challengeMessageId: string,
		declinerId: string
	): Promise<{ success: boolean; game?: MoreOrLessGame; error?: string }> {
		const challenge = this.challenges.get(challengeMessageId);
		if (!challenge) return { success: false, error: 'Défi introuvable.' };

		if (challenge.player2.id !== declinerId) {
			return { success: false, error: "Ce défi n'est pas pour toi !" };
		}

		// Rembourser le joueur 1
		if (challenge.player1.id !== 'bot') {
			await container.casinoService.transaction(challenge.player1.id, challenge.bet, 'add');
		}

		challenge.status = 'cancelled';
		this.challenges.delete(challengeMessageId);

		return { success: true, game: challenge };
	}

	/**
	 * Annule un défi (timeout ou annulation manuelle)
	 */
	public async cancelChallenge(challengeMessageId: string): Promise<void> {
		const challenge = this.challenges.get(challengeMessageId);
		if (!challenge) return;

		// Rembourser le joueur 1
		if (challenge.player1.id !== 'bot') {
			await container.casinoService.transaction(challenge.player1.id, challenge.bet, 'add');
		}

		challenge.status = 'cancelled';
		this.challenges.delete(challengeMessageId);
	}
}
