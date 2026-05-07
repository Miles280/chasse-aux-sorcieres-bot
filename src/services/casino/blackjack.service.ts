import { Collection } from 'discord.js';
import { container } from '@sapphire/framework';
import axios from 'axios';
import { BlackjackGame } from '../../models/casino/BlackjackGame.interface';
import { BlackjackMessageBuilder } from '../../builders/casino/BlackjackMessage.builder';

export class BlackjackService {
	// Stockage des parties en cours
	private games = new Collection<string, BlackjackGame>();

	/**
	 * Reset du timer de jeu (60s)
	 */
	private resetGameTimer(game: BlackjackGame) {
		this.clearGameTimer(game);

		game.timer = setTimeout(async () => {
			this.games.delete(game.messageId);
			game.status = 'finished';
			game.result = 'timeout';

			// 1. Log de la partie (perdue par timeout)
			await container.casinoService.logGame(game.userId, 'blackjack', game.bet, 0, {
				result: 'timeout',
				playerScore: this.calculateScore(game.playerCards),
				dealerScore: this.calculateScore(game.dealerCards),
				isDoubled: game.bet > game.initialBet
			});

			// 2. Mise à jour du message Discord
			try {
				const channel = await container.client.channels.fetch(game.channelId);
				if (!channel?.isTextBased()) return;

				const message = await channel.messages.fetch(game.messageId);
				if (!message) return;

				const msgPayload = await BlackjackMessageBuilder.buildGameMessage(game);
				await message.edit(msgPayload as any);
			} catch (error) {
				console.error('Erreur timeout Blackjack:', error);
			}
		}, 60000);
	}

	/**
	 * Stoppe le timer en cours
	 */
	private clearGameTimer(game: BlackjackGame) {
		if (game.timer) {
			clearTimeout(game.timer);
			delete game.timer;
		}
	}

	/**
	 * Calcul du score des cartes
	 */
	public calculateScore(cards: string[]): number {
		if (!Array.isArray(cards)) return 0;

		let score = 0;
		let aces = 0;

		for (const url of cards) {
			if (typeof url !== 'string') continue;

			// 1. Extraction du code carte
			const filename = url.split('/').pop()?.split('.')[0].toUpperCase() || '';
			if (!filename) continue;

			const valueChar = filename[0];

			// 2. Attribution des valeurs
			if (valueChar === 'A') {
				score += 11;
				aces++;
			} else if (['K', 'Q', 'J', '0', '1'].includes(valueChar)) {
				score += 10;
			} else {
				const val = parseInt(valueChar);
				score += isNaN(val) ? 0 : val;
			}
		}

		// 3. Ajustement des As si dépassement
		while (score > 21 && aces > 0) {
			score -= 10;
			aces--;
		}

		return score;
	}

	/**
	 * Création d’une partie
	 */
	public async initGame(userId: string, bet: number, messageId: string, channelId: string): Promise<BlackjackGame | null> {
		try {
			// 1. Création du deck
			const deck = await axios.get('https://deckofcardsapi.com/api/deck/new/shuffle/?deck_count=1');
			const deckId = deck.data.deck_id;

			// 2. Distribution initiale
			const draw = await axios.get(`https://deckofcardsapi.com/api/deck/${deckId}/draw/?count=4`);
			const cards = draw.data.cards;

			const game: BlackjackGame = {
				channelId,
				messageId,
				userId,
				deckId,
				bet,
				initialBet: bet,
				playerCards: [cards[0].image, cards[1].image],
				dealerCards: [cards[2].image, cards[3].image],
				status: 'playing'
			};

			// 3. Vérifie blackjack immédiat
			if (this.calculateScore(game.playerCards) === 21) {
				const finalGame = await this.stand(game);

				this.setupReplayTimeout(game.channelId, game.messageId);

				return finalGame;
			}

			this.games.set(messageId, game);
			this.resetGameTimer(game);

			return game;
		} catch (error) {
			console.error(error);
			return null;
		}
	}

	/**
	 * Action HIT (tirer une carte)
	 */
	public async hit(messageId: string): Promise<BlackjackGame | null> {
		const game = this.games.get(messageId);
		if (!game) return null;

		// 1. Pioche carte
		const draw = await axios.get(`https://deckofcardsapi.com/api/deck/${game.deckId}/draw/?count=1`);
		game.playerCards.push(draw.data.cards[0].image);

		// 2. Vérifie bust
		if (this.calculateScore(game.playerCards) > 21) {
			this.clearGameTimer(game);
			game.status = 'finished';
			game.result = 'lose';
			this.games.delete(messageId);

			// 3. Log perte
			await container.casinoService.logGame(game.userId, 'blackjack', game.bet, 0, {
				result: 'lose',
				playerScore: this.calculateScore(game.playerCards),
				dealerScore: this.calculateScore(game.dealerCards),
				reason: 'bust',
				isDoubled: false
			});
		} else {
			// 4. Reset timer si jeu continue
			this.resetGameTimer(game);
		}

		return game;
	}

	/**
	 * Action STAND (fin du tour joueur)
	 */
	public async stand(gameOrId: string | BlackjackGame): Promise<BlackjackGame> {
		const game = typeof gameOrId === 'string' ? this.games.get(gameOrId)! : gameOrId;

		if (!game) return game;

		this.clearGameTimer(game);

		// 1. Empêche double exécution
		if (game.status === 'finished') return game;

		game.status = 'dealer_turn';

		const playerScore = this.calculateScore(game.playerCards);
		let dealerScore = this.calculateScore(game.dealerCards);

		// 2. Tour du croupier
		if (playerScore <= 21) {
			while (dealerScore < 17) {
				const draw = await axios.get(`https://deckofcardsapi.com/api/deck/${game.deckId}/draw/?count=1`);
				game.dealerCards.push(draw.data.cards[0].image);
				dealerScore = this.calculateScore(game.dealerCards);
			}
		}

		game.status = 'finished';

		// 3. Détermination du résultat
		const playerHasBJ = playerScore === 21 && game.playerCards.length === 2;
		const dealerHasBJ = dealerScore === 21 && game.dealerCards.length === 2;

		if (playerHasBJ && !dealerHasBJ) game.result = 'blackjack';
		else if (dealerHasBJ && !playerHasBJ) game.result = 'lose';
		else if (playerHasBJ && dealerHasBJ) game.result = 'draw';
		else if (playerScore > 21) game.result = 'lose';
		else if (dealerScore > 21) game.result = 'win';
		else if (playerScore > dealerScore) game.result = 'win';
		else if (dealerScore > playerScore) game.result = 'lose';
		else game.result = 'draw';

		// 4. Payout
		let payout = 0;
		if (game.result === 'win') payout = game.bet * 2;
		else if (game.result === 'blackjack') payout = Math.floor(game.bet * 2.5);
		else if (game.result === 'draw') payout = game.bet;

		if (payout > 0) {
			await container.casinoService.transaction(game.userId, payout, 'add');
		}

		// 5. Log partie
		await container.casinoService.logGame(game.userId, 'blackjack', game.bet, payout, {
			result: game.result,
			playerScore,
			dealerScore,
			isDoubled: game.bet > game.initialBet
		});

		this.games.delete(game.messageId);
		return game;
	}

	/**
	 * Action DOUBLE DOWN
	 */
	public async doubleDown(messageId: string): Promise<BlackjackGame | null> {
		const game = this.games.get(messageId);
		if (!game) return null;

		// 1. Vérifie solde
		const check = await container.economyService.view(game.userId);
		if (!check.success || check.data.rubies < game.bet) return null;

		// 2. Retire la mise supplémentaire
		const transaction = await container.casinoService.transaction(game.userId, game.bet, 'remove');
		if (!transaction.success) return null;

		game.bet *= 2;

		// 3. Pioche une carte
		const draw = await axios.get(`https://deckofcardsapi.com/api/deck/${game.deckId}/draw/?count=1`);
		game.playerCards.push(draw.data.cards[0].image);

		// 4. Fin automatique du tour
		return await this.stand(game);
	}

	/**
	 * Récupération d’une partie
	 */
	public getGame(id: string) {
		return this.games.get(id);
	}

	/**
	 * Supprime le bouton Rejouer au bout d'une minute
	 */
	private setupReplayTimeout(channelId: string, messageId: string) {
		setTimeout(async () => {
			try {
				const channel = await container.client.channels.fetch(channelId);
				if (!channel?.isTextBased()) return;

				const message = await channel.messages.fetch(messageId);
				if (!message) return;

				await message.edit({ components: [] });
			} catch {
				// ignore
			}
		}, 60000);
	}
}
