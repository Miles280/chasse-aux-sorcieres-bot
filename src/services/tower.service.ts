import { Collection } from 'discord.js';
import { TowerGame, TowerTurnResult } from '../models/TowerGame.interface';
import { container } from '@sapphire/framework';
import { TowerMessageBuilder } from '../builders/TowerMessage.builder';
import { TOWER_CONFIG } from '../utils/constants';

export class TowerService {
	// Stockage RAM
	private games = new Collection<string, TowerGame>();

	// 1. Générer la grille (Ta logique)
	public generateGrid(): number[] {
		return Array.from({ length: 10 }, () => Math.floor(Math.random() * 3));
	}

	// 2. Enregistrer la partie (Appelé par la commande APRES l'envoi du message)
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

	// 3. Jouer un coup (Appelé par le Handler)
	public async playTurn(messageId: string, userId: string, choiceIndex: number | 'stop'): Promise<TowerTurnResult> {
		const game = this.games.get(messageId);

		if (!game) return { status: 'error', message: 'Partie expirée.' };
		if (game.userId !== userId) return { status: 'error', message: "Ce n'est pas votre partie !" };

		clearTimeout(game.timer); // Reset timer

		// --- CAS : CASHOUT ---
		if (choiceIndex === 'stop') {
			return this.processEndGame(game, 'cashout');
		}

		const bombPosition = game.grid[game.currentFloor];

		// --- CAS : PERDU ---
		if (choiceIndex === bombPosition) {
			return this.processEndGame(game, 'lose', choiceIndex);
		}

		// --- CAS : GAGNÉ (Etage suivant) ---
		game.history.push(choiceIndex);
		game.currentFloor++;

		// Victoire totale (Etage 10 atteint)
		if (game.currentFloor >= 10) {
			return this.processEndGame(game, 'win');
		}

		// Partie continue
		game.timer = this.startTimer(messageId);
		return { status: 'continue', game };
	}

	// 4. Fin de partie (Interne)
	private async processEndGame(game: TowerGame, stop_reason: 'win' | 'lose' | 'cashout', badChoice?: number): Promise<TowerTurnResult> {
		this.games.delete(game.messageId);

		let payout = 0;
		if (stop_reason !== 'lose') {
			// Si cashout, on paie l'étage D'AVANT. Si Win, l'étage 9.
			const floorIndex = stop_reason === 'cashout' ? game.currentFloor - 1 : 9;
			const multiplier = TOWER_CONFIG.MULTIPLIERS[floorIndex] || 1;
			payout = Math.ceil(game.bet * multiplier);

			await container.casinoService.transaction(game.userId, payout, 'add');
		}

		container.casinoService.logGame(game.userId, 'tower', game.bet, payout, { floor: game.currentFloor + 1, stop_reason });

		return { status: stop_reason, game, payout, badChoice };
	}

	// 5. Timer
	private startTimer(messageId: string): NodeJS.Timeout {
		return setTimeout(() => {
			this.handleTimeout(messageId);
		}, 60_000);
	}

	// Gestion du timeout (C'est la seule fois où le Service parle un peu à Discord via le client)
	private async handleTimeout(messageId: string) {
		const game = this.games.get(messageId);
		if (!game) return;
		this.games.delete(messageId);

		try {
			const channel = await container.client.channels.fetch(game.channelId);
			if (channel?.isTextBased()) {
				const message = await channel.messages.fetch(messageId);
				// On utilise le Builder ici pour l'embed de timeout
				if (message) await message.edit({ embeds: [TowerMessageBuilder.buildTimeoutEmbed()], components: [] });
			}
		} catch (e) {
			console.error('Erreur Timeout Tower:', e);
		}
	}
}
