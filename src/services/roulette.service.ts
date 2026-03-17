import { Collection } from 'discord.js';
import { container } from '@sapphire/framework';
import { RouletteGame, RouletteBet, RouletteBetType } from '../models/RouletteGame.interface';
import { ROULETTE_CONFIG } from '../utils/constants';
import { RouletteMessageBuilder } from '../builders/RouletteMessage.builder';
import { BET_OPTIONS } from '../utils/betLabels';

export class RouletteService {
	// Configuration interne
	private readonly INITIAL_TIMER = ROULETTE_CONFIG.INITIAL_TIMER;
	private readonly EXTENSION_TIME = ROULETTE_CONFIG.EXTENSION_TIME;
	private readonly MAX_DURATION = ROULETTE_CONFIG.MAX_DURATION;

	private games = new Collection<string, RouletteGame>();

	/**
	 * Vérifie si une partie de roulette est déjà active dans un salon.
	 */
	public hasGameInChannel(channelId: string): boolean {
		const game = this.games.get(channelId);
		return !!game && game.status !== 'finished';
	}

	public getGameInChannel(channelId: string) {
		const game = this.games.get(channelId);
		return game && game.status !== 'finished' ? game : null;
	}

	/**
	 * Crée un nouveau lobby de roulette et démarre le timer initial.
	 */
	public createLobby(messageId: string, channelId: string, endsAt: number, createdAt: number) {
		const game: RouletteGame = {
			channelId,
			messageId,
			status: 'betting',
			bets: [],
			endsAt,
			createdAt,

			// Lance automatiquement le spin après le timer initial
			timer: setTimeout(() => this.startSpin(channelId), this.INITIAL_TIMER)
		};

		this.games.set(channelId, game);
	}

	/**
	 * Ajoute une mise à la partie en cours.
	 * Peut aussi prolonger le timer si la limite max n'est pas atteinte.
	 */
	public async addBet(channelId: string, userId: string, amount: number, type: RouletteBetType) {
		const game = this.games.get(channelId);
		if (!game || game.status !== 'betting') return null;

		// 1. Ajouter la mise
		const bet: RouletteBet = { userId, amount, type };
		game.bets.push(bet);

		const now = Date.now();
		const absoluteLimit = game.createdAt + this.MAX_DURATION;

		// 2. Calculer la nouvelle fin du lobby
		let newEndsAt = game.endsAt + this.EXTENSION_TIME;
		if (newEndsAt > absoluteLimit) newEndsAt = absoluteLimit;

		// 3. Si la durée augmente, on reset le timer
		if (newEndsAt > game.endsAt) {
			game.endsAt = newEndsAt;

			clearTimeout(game.timer);

			const newDelay = newEndsAt - now;
			game.timer = setTimeout(() => this.startSpin(channelId), newDelay);
		}

		// 4. Mettre à jour l'affichage du lobby
		await this.updateDisplay(game);

		return bet;
	}

	/**
	 * Lance la roulette lorsque le timer du lobby expire.
	 * Génère un numéro gagnant et démarre l'animation.
	 */
	private async startSpin(channelId: string) {
		const game = this.games.get(channelId);
		if (!game) return;

		const channel = await container.client.channels.fetch(game.channelId);
		if (!channel?.isTextBased()) return;

		const message = await channel.messages.fetch(game.messageId);

		// 1. Si aucune mise → annuler la partie
		if (game.bets.length === 0) {
			const cancelEmbed = RouletteMessageBuilder.buildCancelledEmbed();

			await message.edit({
				embeds: [cancelEmbed],
				components: []
			});

			this.games.delete(channelId);
			return;
		}

		// 2. Passer la partie en mode "spinning"
		game.status = 'spinning';

		const winningNumber = Math.floor(Math.random() * 37);

		// 3. Fermer le lobby (plus de mises)
		const closedLobby = RouletteMessageBuilder.buildClosedLobbyEmbed(game);

		await message.edit({
			embeds: [closedLobby],
			components: []
		});

		// 4. Envoyer le message d'animation du spin
		const spinPayload = RouletteMessageBuilder.buildGameMessage(game, winningNumber);
		const spinMessage = await message.reply(spinPayload);

		game.spinMessageId = spinMessage.id;

		// 5. Résoudre la partie après la durée du spin
		setTimeout(() => this.resolveGame(channelId, winningNumber), ROULETTE_CONFIG.SPIN_DURATION_MS);
	}

	/**
	 * Calcule les gains des joueurs, distribue les récompenses et clôture la partie.
	 * Gère également la suppression automatique du bouton "Rejouer" après 1 minute.
	 */
	private async resolveGame(channelId: string, winningNumber: number) {
		const game = this.games.get(channelId);
		if (!game) return;

		const playerSummaries = new Map<string, { payout: number; totalBet: number }>();
		const winningColor = ROULETTE_CONFIG.getColor(winningNumber);

		// 1. Calcul des gains de chaque joueur en fonction des multiplicateurs.
		for (const bet of game.bets) {
			const current = playerSummaries.get(bet.userId) ?? { payout: 0, totalBet: 0 };

			let win = false;
			let multiplier = 0;

			if (typeof bet.type === 'number') {
				const option = BET_OPTIONS.number;
				win = option.isWin(winningNumber, winningColor, bet.type);
				multiplier = option.multiplier;
			} else {
				const option = BET_OPTIONS[bet.type];
				win = option.isWin(winningNumber, winningColor);
				multiplier = option.multiplier;
			}

			if (win) current.payout += Math.ceil(bet.amount * multiplier);
			current.totalBet += bet.amount;

			playerSummaries.set(bet.userId, current);
		}

		const winners: { userId: string; payout: number }[] = [];

		// 2. Distribution des rubis et journalisation des logs.
		for (const [userId, data] of playerSummaries) {
			if (data.payout > 0) {
				winners.push({ userId, payout: data.payout });
				await container.casinoService.transaction(userId, data.payout, 'add');
			}
			container.casinoService.logGame(userId, 'roulette', data.totalBet, data.payout, { winningNumber });
		}

		game.status = 'finished';
		const channel = await container.client.channels.fetch(game.channelId);

		// 3. Mise à jour du message final avec affichage du bouton "Rejouer".
		if (channel?.isTextBased() && game.spinMessageId) {
			const resultMessage = await channel.messages.fetch(game.spinMessageId);

			const messagePayload = RouletteMessageBuilder.buildGameMessage(game, winningNumber, winners);

			const lastMessage = await resultMessage.edit(messagePayload);

			// On crée un collecteur pour supprimer le bouton s'il n'est pas utilisé.
			const collector = lastMessage.createMessageComponentCollector({
				time: 60_000,
				max: 1
			});

			collector.on('end', async (_collected, reason) => {
				// Si le délai expire sans clic, on nettoie les composants du message.
				if (reason === 'time') {
					try {
						const payloadSansButton = RouletteMessageBuilder.buildGameMessage(game, winningNumber, winners, false);
						await lastMessage.edit(payloadSansButton);
					} catch (err) {}
				}
			});
		}

		// 4. Nettoyage de la mémoire.
		this.games.delete(channelId);
	}

	/**
	 * Met à jour l'affichage de la partie.
	 */
	private async updateDisplay(game: RouletteGame, result?: number, winners: any[] = []) {
		const channel = await container.client.channels.fetch(game.channelId);

		if (channel?.isTextBased() && game.messageId) {
			const message = await channel.messages.fetch(game.messageId);

			const messagePayload = RouletteMessageBuilder.buildGameMessage(game, result, winners);

			await message.edit(messagePayload);
		}
	}
}
