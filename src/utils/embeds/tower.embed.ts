import { EmbedBuilder } from 'discord.js';
import { TowerGame } from '../../models/TowerGame.interface';
import { emojis } from '../emojis';
import { colors } from '../customColors';

function calculateGain(bet: number, floor: number) {
	return Math.ceil(bet * (1 + 0.1 * Math.pow(floor, 2)));
}

export function towerEmbed(grid: number[], history: number[], currentFloor: number, bet: number, userId: string) {
	let towerVisual = '';

	// On dessine de haut en bas
	for (let i = 9; i >= 0; i--) {
		const floorNumber = i + 1;
		const padding = floorNumber < 10 ? ' ' : '';

		let line = `Étage ${padding}${floorNumber} : `;

		// On regarde si le joueur a déjà joué à cet étage
		const playedIndex = history[i];
		const bombPos = grid[i]; // Index de la bombe à cet étage

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
		if (i === currentFloor) {
			line += ' 📍';
		}

		towerVisual += line + '\n';
	}

	return new EmbedBuilder()
		.setColor(colors.goldCasino)
		.setTitle(`${emojis.yellowcheck} La Tour de la Fortune`)
		.addFields(
			{ name: 'Mise', value: `${bet} ${emojis.rubies}`, inline: true },
			{ name: 'Gain actuel', value: `${currentFloor === 0 ? 0 : calculateGain(bet, currentFloor)} ${emojis.rubies}`, inline: true },
			{ name: 'Prochain gain', value: `${calculateGain(bet, currentFloor + 1)} ${emojis.rubies}`, inline: true }
		)
		.setDescription(`**__Joueur__ :** <@${userId}>\n\`\`\`\n${towerVisual}\`\`\``);
}

export function towerEndEmbed(game: TowerGame, reason: 'win' | 'lose' | 'cashout', winAmount: number, userId: string, badChoice?: number) {
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

		if (reason === 'lose' && i === game.currentFloor) {
			// En cas de défaite, le marqueur est sur l'étage de l'explosion
			line += ' 📍';
		} else if ((reason === 'cashout' || reason === 'win') && i === game.currentFloor - 1) {
			// En cas de succès/cashout, le marqueur est sur le dernier étage validé
			line += ' 📍';
		}

		towerVisual += line + '\n';
	}

	const color = reason === 'lose' ? colors.fail : colors.success;
	const title = reason === 'lose' ? `${emojis.redcheck} La Tour de la Fortune` : `${emojis.greencheck} La Tour de la Fortune`;
	const desc =
		reason === 'lose' ? `Vous perdez votre mise de **${game.bet} ${emojis.rubies}**.` : `Vous repartez avec **${winAmount} ${emojis.rubies}** !`;

	return new EmbedBuilder().setColor(color).setTitle(title).setDescription(`**__Joueur__ :** <@${userId}>\n\`\`\`\n${towerVisual}\`\`\`\n${desc}`);
}
