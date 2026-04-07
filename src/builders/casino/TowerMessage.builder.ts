import { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import { TowerGame } from '../../models/TowerGame.interface';
import { emojis } from '../../utils/emojis';
import { colors } from '../../utils/customColors';
import { TOWER_CONFIG } from '../../utils/constants';

export class TowerMessageBuilder {
	/**
	 * Calcule le gain d'un étage en fonction de la mise.
	 * Floor = 1 → premier étage, Floor = 10 → dernier étage
	 */
	public static getGain(bet: number, floor: number): number {
		if (floor <= 0) return 0;
		if (floor > 10) floor = 10;

		const multiplier = TOWER_CONFIG.MULTIPLIERS[floor - 1];
		return Math.ceil(bet * multiplier);
	}

	/**
	 * Construit l'embed principal pendant la partie
	 */
	public static buildGameEmbed(game: TowerGame): EmbedBuilder {
		let towerVisual = '';

		// Dessin de la tour de haut en bas
		for (let i = 9; i >= 0; i--) {
			const floorNumber = i + 1;
			const padding = floorNumber < 10 ? ' ' : '';

			let line = `Étage ${padding}${floorNumber} : `;
			const playedIndex = game.history[i];
			const bombPos = game.grid[i];

			if (playedIndex === undefined) {
				// Étages non joués → cases noires
				line += '⬛ ⬛ ⬛';
			} else {
				// Étages joués → on montre le chemin et la bombe
				const tiles = [0, 1, 2].map((pos) => {
					if (pos === playedIndex) return '✅'; // choix du joueur
					if (pos === bombPos) return '💣'; // bombe
					return '🟩'; // autre case
				});
				line += tiles.join(' ');
			}

			// Marqueur de la position actuelle
			if (i === game.currentFloor) line += ' 📍';

			towerVisual += line + '\n';
		}

		const currentGain = this.getGain(game.bet, game.currentFloor);
		const nextGain = game.currentFloor < 10 ? this.getGain(game.bet, game.currentFloor + 1) : currentGain;

		return new EmbedBuilder()
			.setColor(colors.goldCasino)
			.setTitle(`${emojis.yellowcheck} La Tour de la Fortune`)
			.addFields(
				{ name: 'Gain actuel :', value: `> \`${currentGain}\` ${emojis.rubies}`, inline: true },
				{ name: 'Prochain gain :', value: `> \`${nextGain}\` ${emojis.rubies}`, inline: true }
			)
			.setDescription(`__Mise de départ__ : \`${game.bet}\` ${emojis.rubies}\n\`\`\`\n${towerVisual}\`\`\``);
	}

	/**
	 * Construit l'embed de fin de partie (win, lose ou cashout)
	 */
	public static buildEndEmbed(game: TowerGame, reason: 'win' | 'lose' | 'cashout', winAmount: number, badChoice?: number): EmbedBuilder {
		let towerVisual = '';

		// Dessin de la tour final
		for (let i = 9; i >= 0; i--) {
			const floorNumber = i + 1;
			const padding = floorNumber < 10 ? ' ' : '';
			const bombPos = game.grid[i];
			const playedIndex = game.history[i];

			let line = `Étage ${padding}${floorNumber} : `;

			const tiles = [0, 1, 2].map((pos) => {
				if (reason === 'lose' && i === game.currentFloor && pos === badChoice) return '💥'; // case perdue
				if (playedIndex === pos) return '✅'; // cases gagnées
				if (pos === bombPos) return '💣'; // bombes restantes
				return '🟩'; // autre case
			});

			line += tiles.join(' ');

			// Marqueur 📍 selon le résultat
			if (reason === 'lose' && i === game.currentFloor) line += ' 📍';
			else if ((reason === 'cashout' || reason === 'win') && i === game.currentFloor - 1) line += ' 📍';

			towerVisual += line + '\n';
		}

		const color = reason === 'lose' ? colors.fail : colors.success;
		const title = reason === 'lose' ? `${emojis.redcheck} La Tour de la Fortune` : `${emojis.greencheck} La Tour de la Fortune`;
		const desc = reason === 'lose' ? '> Vous repartez les mains vides.' : `> Vous repartez avec \`${winAmount}\` ${emojis.rubies} !`;

		return new EmbedBuilder()
			.setColor(color)
			.setTitle(title)
			.setDescription(`__Mise de départ__ : \`${game.bet}\` ${emojis.rubies}\n\`\`\`\n${towerVisual}\`\`\`\n${desc}`);
	}

	/**
	 * Embed affiché quand la partie expire (timeout)
	 */
	public static buildTimeoutEmbed(): EmbedBuilder {
		return new EmbedBuilder()
			.setColor(colors.fail)
			.setTitle('⌛ Temps écoulé !')
			.setDescription('Vous avez été trop lent. La partie est annulée et la mise perdue.');
	}

	/**
	 * Génère les boutons pour la partie
	 * finished = true → bouton Rejouer
	 * finished = false → boutons de choix + encaisser
	 */
	public static buildComponents(game: TowerGame, finished: boolean): ActionRowBuilder<ButtonBuilder>[] {
		const rows: ActionRowBuilder<ButtonBuilder>[] = [];
		const ownerId = game.userId;

		if (finished) {
			// Bouton "Rejouer"
			const replayRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
				new ButtonBuilder().setCustomId(`tower:playAgain:${ownerId}:${game.bet}`).setLabel(`Rejouer`).setStyle(ButtonStyle.Primary)
			);
			rows.push(replayRow);
		} else {
			// --- Partie en cours ---

			// 1. Les trois boutons de choix (mystère)
			const playRow = new ActionRowBuilder<ButtonBuilder>();
			for (let i = 0; i < 3; i++) {
				playRow.addComponents(
					new ButtonBuilder()
						.setCustomId(`tower:play:${ownerId}:${i}`) // format attendu par le handler
						.setLabel('❓')
						.setStyle(ButtonStyle.Secondary)
				);
			}
			rows.push(playRow);

			// 2. Bouton "Encaisser" si étage >= 1
			if (game.currentFloor > 0) {
				const stopRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
					new ButtonBuilder().setCustomId(`tower:stop:${ownerId}`).setLabel('💰 Encaisser').setStyle(ButtonStyle.Success)
				);
				rows.push(stopRow);
			}
		}

		return rows;
	}
}
