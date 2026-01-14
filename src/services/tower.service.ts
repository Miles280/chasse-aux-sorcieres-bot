import { EmbedBuilder, Collection } from 'discord.js';
import { TowerGame, TowerResult } from '../models/TowerGame.interface';
import * as Embeds from '../utils/embeds';
import * as Components from '../utils/components';

export class TowerService {
	// Stockage en mémoire RAM des parties en cours
	private games = new Collection<string, TowerGame>();

	// 1. Logique métier : Générer la grille
	private generateGrid(): number[] {
		return Array.from({ length: 10 }, () => Math.floor(Math.random() * 3));
	}

	// 2. Création de la partie
	public async createGame(interaction: any, bet: number) {
		const grid = this.generateGrid();
		const history: number[] = [];

		const embed = Embeds.towerEmbed(grid, history, 0, bet);
		const components = Components.buildTowerButtons(0);

		const message = await interaction.reply({
			embeds: [embed],
			components: [components],
			fetchReply: true
		});

		// On sauvegarde l'état
		const game: TowerGame = {
			userId: interaction.user.id,
			bet,
			currentFloor: 0,
			grid,
			history,
			message,
			timer: this.startTimer(message.id)
		};

		this.games.set(message.id, game);
	}

	// 3. Gestion des actions
	public async handleInput(messageId: string, userId: string, choiceIndex: number | 'stop'): Promise<TowerResult> {
		const game = this.games.get(messageId);

		if (!game) return { error: 'Partie introuvable ou terminée.' };
		if (game.userId !== userId) return { error: "Ce n'est pas votre partie !" };

		clearTimeout(game.timer); // Reset du timer

		// --- CAS : STOP ---
		if (choiceIndex === 'stop') {
			return this.endGame(messageId, 'cashout');
		}

		const bombPosition = game.grid[game.currentFloor];

		// --- CAS : PERDU ---
		if (choiceIndex === bombPosition) {
			return this.endGame(messageId, 'lose', choiceIndex);
		}

		// --- CAS : GAGNÉ (Etage suivant) ---
		game.history.push(choiceIndex);

		game.currentFloor++;

		// Victoire totale (étage 10 atteint)
		if (game.currentFloor >= 10) {
			return this.endGame(messageId, 'win');
		}

		// On continue la partie
		game.timer = this.startTimer(messageId);

		// Mise à jour visuelle
		const embed = Embeds.towerEmbed(game.grid, game.history, game.currentFloor, game.bet);
		const components = Components.buildTowerButtons(game.currentFloor);

		return {
			payload: { embeds: [embed], components: [components] },
			finished: false
		};
	}

	// 4. Timer
	private startTimer(messageId: string): NodeJS.Timeout {
		return setTimeout(() => {
			this.handleTimeout(messageId);
		}, 60_000); // 60 secondes
	}

	private async handleTimeout(messageId: string) {
		const game = this.games.get(messageId);
		if (!game) return;
		this.games.delete(messageId);

		const timeoutEmbed = new EmbedBuilder()
			.setColor(0xff0000)
			.setTitle('Temps écoulé !')
			.setDescription('Vous avez été trop lent. La partie est terminée.');

		try {
			if (game.message.edit) await game.message.edit({ embeds: [timeoutEmbed], components: [] });
		} catch (e) {
			console.error('Erreur timeout edit', e);
		}
	}

	// 5. Fin de partie
	private async endGame(messageId: string, reason: 'win' | 'lose' | 'cashout', badChoice?: number) {
		const game = this.games.get(messageId)!;
		this.games.delete(messageId);

		let winAmount = 0;

		// Logique de calcul (Maths)
		const floorToCalculate = reason === 'lose' ? game.currentFloor : game.currentFloor;
		const multiplier = 1 + 0.1 * Math.pow(floorToCalculate, 2);

		if (reason === 'cashout' || reason === 'win') {
			winAmount = Math.ceil(game.bet * multiplier);
			// TODO: Ajouter l'appel API ici pour créditer le joueur
			// await this.api.post('/user/add', { userId: game.userId, amount: winAmount ... });
		}

		const embed = Embeds.towerEndEmbed(game, reason, winAmount, badChoice);

		return {
			payload: { embeds: [embed], components: [] },
			finished: true
		};
	}
}
