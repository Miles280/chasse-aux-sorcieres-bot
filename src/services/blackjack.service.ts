import { Collection } from 'discord.js';
import { container } from '@sapphire/framework';
import axios from 'axios';
import { BlackjackGame } from '../models/BlackjackGame.interface';
import { BlackjackMessageBuilder } from '../builders/BlackjackMessage.builder';

export class BlackjackService {
	private games = new Collection<string, BlackjackGame>();

	// =========================================================
	// GESTION DU TEMPS (NOUVEAU)
	// =========================================================
	private resetGameTimer(game: BlackjackGame) {
		this.clearGameTimer(game);

		// Timer de 60 secondes
		game.timer = setTimeout(async () => {
			this.games.delete(game.messageId);
			game.status = 'finished';
			game.result = 'timeout';

			// Le joueur perd sa mise
			await container.casinoService.logGame(game.userId, 'blackjack', game.bet, 0, { result: 'timeout' });

			// On met à jour le message Discord depuis le service
			try {
				const channel = await container.client.channels.fetch(game.channelId);
				if (channel?.isTextBased()) {
					const message = await channel.messages.fetch(game.messageId);
					if (message) {
						const msgPayload = await BlackjackMessageBuilder.buildGameMessage(game);
						await message.edit(msgPayload as any);
					}
				}
			} catch (error) {
				console.error('Impossible de mettre à jour le message de Blackjack après un timeout', error);
			}
		}, 60000);
	}

	private clearGameTimer(game: BlackjackGame) {
		if (game.timer) {
			clearTimeout(game.timer);
			delete game.timer;
		}
	}

	// Calcule le score à partir des URLs de l'API DeckOfCards
	public calculateScore(cards: string[]): number {
		let score = 0;
		let aces = 0;

		for (const url of cards) {
			const filename = url.split('/').pop()?.split('.')[0].toUpperCase() || '';
			if (!filename) continue;

			const firstChar = filename[0];

			if (firstChar === 'A') {
				score += 11;
				aces++;
			} else if (['K', 'Q', 'J', '0', '1'].includes(firstChar)) {
				score += 10;
			} else {
				const val = parseInt(firstChar);
				score += isNaN(val) ? 0 : val;
			}
		}

		while (score > 21 && aces > 0) {
			score -= 10;
			aces--;
		}
		return score;
	}

	public async initGame(userId: string, bet: number, messageId: string, channelId: string): Promise<BlackjackGame | null> {
		try {
			const deck = await axios.get('https://deckofcardsapi.com/api/deck/new/shuffle/?deck_count=1');
			const deckId = deck.data.deck_id;
			const draw = await axios.get(`https://deckofcardsapi.com/api/deck/${deckId}/draw/?count=4`);
			const cards = draw.data.cards;

			const game: BlackjackGame = {
				channelId,
				messageId,
				userId,
				deckId,
				bet,
				playerCards: [cards[0].image, cards[1].image],
				dealerCards: [cards[2].image, cards[3].image],
				status: 'playing'
			};

			// Vérification Blackjack immédiat
			if (this.calculateScore(game.playerCards) === 21) {
				return await this.stand(game);
			}

			this.games.set(messageId, game);
			this.resetGameTimer(game);
			return game;
		} catch (error) {
			console.error(error);
			return null;
		}
	}

	public async hit(messageId: string): Promise<BlackjackGame | null> {
		const game = this.games.get(messageId);
		if (!game) return null;

		const draw = await axios.get(`https://deckofcardsapi.com/api/deck/${game.deckId}/draw/?count=1`);
		game.playerCards.push(draw.data.cards[0].image);

		if (this.calculateScore(game.playerCards) > 21) {
			this.clearGameTimer(game);
			game.status = 'finished';
			game.result = 'lose';
			this.games.delete(messageId);
			// Si le joueur dépasse 21, il perd sa mise immédiatement.
			await container.casinoService.logGame(game.userId, 'blackjack', game.bet, 0, { result: 'lose' });
		} else {
			this.resetGameTimer(game);
		}

		return game;
	}

	public async stand(gameOrId: string | BlackjackGame): Promise<BlackjackGame> {
		const game = typeof gameOrId === 'string' ? this.games.get(gameOrId)! : gameOrId;
		if (!game) return game;

		this.clearGameTimer(game);

		// Empêcher de stand si le jeu est déjà fini (évite les doubles logs)
		if (game.status === 'finished') return game;

		game.status = 'dealer_turn';

		let dealerScore = this.calculateScore(game.dealerCards);

		// IA du Croupier : Pioche tant qu'il est en dessous de 17
		while (dealerScore < 17) {
			const draw = await axios.get(`https://deckofcardsapi.com/api/deck/${game.deckId}/draw/?count=1`);
			game.dealerCards.push(draw.data.cards[0].image);
			dealerScore = this.calculateScore(game.dealerCards);
		}

		game.status = 'finished';
		const playerScore = this.calculateScore(game.playerCards);

		// --- DÉTERMINATION DU RÉSULTAT (Règles strictes) ---
		const playerHasBJ = playerScore === 21 && game.playerCards.length === 2;
		const dealerHasBJ = dealerScore === 21 && game.dealerCards.length === 2;

		if (playerHasBJ && !dealerHasBJ) {
			// Le joueur a un Blackjack naturel, le croupier non (même s'il a 21 en 3 cartes)
			game.result = 'blackjack';
		} else if (dealerHasBJ && !playerHasBJ) {
			// Le croupier a un Blackjack, le joueur perd
			game.result = 'lose';
		} else if (playerHasBJ && dealerHasBJ) {
			// Deux naturels : Égalité
			game.result = 'draw';
		} else if (playerScore > 21) {
			game.result = 'lose';
		} else if (dealerScore > 21) {
			game.result = 'win';
		} else if (playerScore > dealerScore) {
			game.result = 'win';
		} else if (dealerScore > playerScore) {
			game.result = 'lose';
		} else {
			game.result = 'draw';
		}

		// --- PAIEMENTS ---
		let payout = 0;
		if (game.result === 'win') payout = game.bet * 2;
		else if (game.result === 'blackjack') payout = Math.floor(game.bet * 2.5);
		else if (game.result === 'draw') payout = game.bet;

		if (payout > 0) await container.casinoService.transaction(game.userId, payout, 'add');
		await container.casinoService.logGame(game.userId, 'blackjack', game.bet, payout, { result: game.result });

		this.games.delete(game.messageId);
		return game;
	}

	public getGame(id: string) {
		return this.games.get(id);
	}
}
