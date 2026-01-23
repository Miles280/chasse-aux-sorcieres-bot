import { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import { TowerGame } from '../models/TowerGame.interface';
import { emojis } from '../utils/emojis';
import { colors } from '../utils/customColors';
import { TOWER_CONFIG } from '../utils/constants';

export class TowerMessageBuilder {
	/**
	 * Calcule le gain en fonction de la mise et de l'étage
	 */
	public static getGain(bet: number, floor: number): number {
		if (floor <= 0) return 0;
		if (floor > 10) floor = 10;
		const multiplier = TOWER_CONFIG.MULTIPLIERS[floor - 1];
		return Math.ceil(bet * multiplier);
	}

	// ==========================================
	// 1. EMBEDS
	// ==========================================

	/**
	 * Construit l'Embed en cours de jeu
	 */
	public static buildGameEmbed(game: TowerGame): EmbedBuilder {
		let towerVisual = '';

		// On dessine de haut en bas
		for (let i = 9; i >= 0; i--) {
			const floorNumber = i + 1;
			const padding = floorNumber < 10 ? ' ' : '';

			let line = `Étage ${padding}${floorNumber} : `;

			const playedIndex = game.history[i];
			const bombPos = game.grid[i];

			if (playedIndex === undefined) {
				// Étage pas encore joué : tout noir
				line += '⬛ ⬛ ⬛';
			} else {
				// Étage réussi : on révèle le chemin et la bombe
				const tiles = [0, 1, 2].map((pos) => {
					if (pos === playedIndex) return '✅'; // Case cliquée (gagnée)
					if (pos === bombPos) return '💣'; // Emplacement de la bombe révélé
					return '🟩'; // La troisième case
				});
				line += tiles.join(' ');
			}

			// Ajout du marqueur "Vous êtes ici"
			if (i === game.currentFloor) {
				line += ' 📍';
			}

			towerVisual += line + '\n';
		}

		const currentGain = this.getGain(game.bet, game.currentFloor);
		const nextGain = game.currentFloor < 10 ? this.getGain(game.bet, game.currentFloor + 1) : currentGain;

		return new EmbedBuilder()
			.setColor(colors.goldCasino)
			.setTitle(`${emojis.yellowcheck} La Tour de la Fortune`)
			.addFields(
				{ name: 'Mise', value: `${game.bet} ${emojis.rubies}`, inline: true },
				{ name: 'Gain actuel', value: `${currentGain} ${emojis.rubies}`, inline: true },
				{ name: 'Prochain gain', value: `${nextGain} ${emojis.rubies}`, inline: true }
			)
			.setDescription(`**__Joueur__** : <@${game.userId}>\n\`\`\`\n${towerVisual}\`\`\``);
	}

	/**
	 * Construit l'Embed de fin de partie (Gagné, Perdu ou Cashout)
	 */
	public static buildEndEmbed(game: TowerGame, reason: 'win' | 'lose' | 'cashout', winAmount: number, badChoice?: number): EmbedBuilder {
		let towerVisual = '';

		for (let i = 9; i >= 0; i--) {
			const floorNumber = i + 1;
			const padding = floorNumber < 10 ? ' ' : '';
			const bombPos = game.grid[i];
			const playedIndex = game.history[i];

			let line = `Étage ${padding}${floorNumber} : `;

			const tiles = [0, 1, 2].map((pos) => {
				// Si c'est là où le joueur a perdu
				if (reason === 'lose' && i === game.currentFloor && pos === badChoice) {
					return '💥';
				}
				// Si c'est une case jouée et gagnée précédemment
				if (playedIndex === pos) {
					return '✅';
				}
				// Révélation des bombes restantes
				if (pos === bombPos) return '💣';

				// Le reste
				return '🟩';
			});

			line += tiles.join(' ');

			// Gestion du marqueur 📍 en fin de partie
			if (reason === 'lose' && i === game.currentFloor) {
				// Défaite : marqueur sur l'explosion
				line += ' 📍';
			} else if ((reason === 'cashout' || reason === 'win') && i === game.currentFloor - 1) {
				// Succès/Cashout : marqueur sur le dernier étage validé
				line += ' 📍';
			}

			towerVisual += line + '\n';
		}

		const color = reason === 'lose' ? colors.fail : colors.success;
		const title = reason === 'lose' ? `${emojis.redcheck} La Tour de la Fortune` : `${emojis.greencheck} La Tour de la Fortune`;

		const desc =
			reason === 'lose'
				? `Vous perdez votre mise de **${game.bet} ${emojis.rubies}**.`
				: `Vous repartez avec **${winAmount} ${emojis.rubies}** !`;

		return new EmbedBuilder()
			.setColor(color)
			.setTitle(title)
			.setDescription(`**__Joueur__** : <@${game.userId}>\n\`\`\`\n${towerVisual}\`\`\`\n${desc}`);
	}

	/**
	 * Embed spécial pour le Timeout
	 */
	public static buildTimeoutEmbed(): EmbedBuilder {
		return new EmbedBuilder()
			.setColor(colors.fail)
			.setTitle('⌛ Temps écoulé !')
			.setDescription('Vous avez été trop lent. La partie est annulée et la mise perdue.');
	}

	// ==========================================
	// 2. COMPOSANTS (BOUTONS)
	// ==========================================

	/**
	 * Génère les boutons.
	 * Si `finished` est true -> Bouton Rejouer
	 * Si `finished` est false -> Boutons de jeu (Choix + Cashout)
	 */
	public static buildComponents(game: TowerGame, finished: boolean): ActionRowBuilder<ButtonBuilder>[] {
		const rows: ActionRowBuilder<ButtonBuilder>[] = [];

		if (finished) {
			// --- CAS : PARTIE TERMINÉE (Rejouer) ---
			const replayRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
				new ButtonBuilder()
					.setCustomId(`tower_playAgain_${game.userId}_${game.bet}`)
					.setLabel(`Rejouer la mise`)
					.setStyle(ButtonStyle.Primary)
			);
			rows.push(replayRow);
		} else {
			// --- CAS : EN JEU ---

			// 1. Les trois boutons de choix (Mystère)
			const playRow = new ActionRowBuilder<ButtonBuilder>();
			for (let i = 0; i < 3; i++) {
				playRow.addComponents(
					new ButtonBuilder()
						// Attention : J'ai gardé ton format `tower_play_${i}`
						// Assure-toi que le Handler parse bien "tower", "play", "0"
						.setCustomId(`tower_play_${i}`)
						.setLabel('❓')
						.setStyle(ButtonStyle.Secondary)
				);
			}
			rows.push(playRow);

			// 2. Le bouton "Encaisser" (Uniquement si on a passé au moins l'étage 0)
			if (game.currentFloor > 0) {
				const stopRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
					new ButtonBuilder().setCustomId(`tower_stop`).setLabel('💰 Encaisser').setStyle(ButtonStyle.Success)
				);
				rows.push(stopRow);
			}
		}

		return rows;
	}
}
