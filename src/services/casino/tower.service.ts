import { Collection } from 'discord.js';
import { TowerGame, TowerTurnResult } from '../../models/casino/TowerGame.interface';
import { container } from '@sapphire/framework';
import { TowerMessageBuilder } from '../../builders/casino/TowerMessage.builder';
import { TOWER_CONFIG } from '../../utils/constants';

export class TowerService {
	// Stockage en mémoire des parties
	private games = new Collection<string, TowerGame>();

	/**
	 * Génère une grille aléatoire pour la partie (0 à 2 sur chaque étage)
	 */
	public generateGrid(): number[] {
		return Array.from({ length: 10 }, () => Math.floor(Math.random() * 3));
	}

	/**
	 * Enregistre une partie après l'envoi du message initial
	 */
	public registerGame(messageId: string, channelId: string, userId: string, bet: number, grid: number[]) {
		const game: TowerGame = {
			userId,
			messageId,
			channelId,
			bet,
			currentFloor: 0,
			grid,
			history: [],
			timer: this.startTimer(messageId)
		};

		this.games.set(messageId, game);
	}

	/**
	 * Joue un tour : choix du joueur ou cashout
	 */
	public async playTurn(messageId: string, userId: string, choiceIndex: number | 'stop'): Promise<TowerTurnResult> {
		const game = this.games.get(messageId);

		if (!game) return { status: 'error', message: 'Partie expirée.' };
		if (game.userId !== userId) return { status: 'error', message: "Ce n'est pas votre partie !" };

		clearTimeout(game.timer); // reset timer

		// 1. Cashout
		if (choiceIndex === 'stop') {
			return this.processEndGame(game, 'cashout');
		}

		const bombPosition = game.grid[game.currentFloor];

		// 2. Mauvais choix → perdu
		if (choiceIndex === bombPosition) {
			return this.processEndGame(game, 'lose', choiceIndex);
		}

		// 3. Bon choix → passer à l'étage suivant
		game.history.push(choiceIndex);
		game.currentFloor++;

		// 4. Victoire totale (10 étages atteints)
		if (game.currentFloor >= 10) {
			return this.processEndGame(game, 'win');
		}

		// 5. Partie continue, restart timer
		game.timer = this.startTimer(messageId);
		return { status: 'continue', game };
	}

	/**
	 * Termine la partie et calcule les gains
	 */
	private async processEndGame(game: TowerGame, stop_reason: 'win' | 'lose' | 'cashout', badChoice?: number): Promise<TowerTurnResult> {
		this.games.delete(game.messageId);

		let payout = 0;

		// 1. Calcul des gains si pas perdu
		if (stop_reason !== 'lose') {
			const floorIndex = stop_reason === 'cashout' ? game.currentFloor - 1 : 9;
			const multiplier = TOWER_CONFIG.MULTIPLIERS[floorIndex] || 1;
			payout = Math.ceil(game.bet * multiplier);

			await container.casinoService.transaction(game.userId, payout, 'add');
		}

		// 2. Log de la partie
		container.casinoService.logGame(game.userId, 'tower', game.bet, payout, { floor: game.currentFloor, stop_reason });

		return { status: stop_reason, game, payout, badChoice };
	}

	/**
	 * Lance le timer pour la partie
	 */
	private startTimer(messageId: string): NodeJS.Timeout {
		return setTimeout(() => {
			this.handleTimeout(messageId);
		}, 60_000);
	}

	/**
	 * Gère le timeout (modifie l'embed pour indiquer la fin automatique)
	 */
	private async handleTimeout(messageId: string) {
		const game = this.games.get(messageId);
		if (!game) return;

		this.games.delete(messageId);

		try {
			const channel = await container.client.channels.fetch(game.channelId);
			if (channel?.isTextBased()) {
				const message = await channel.messages.fetch(messageId);

				// 1. Éditer le message pour indiquer le timeout
				if (message) await message.edit({ embeds: [TowerMessageBuilder.buildTimeoutEmbed()], components: [] });
			}
		} catch (e) {
			console.error('Erreur Timeout Tower:', e);
		}
	}
}
