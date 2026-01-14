import { EmbedBuilder } from 'discord.js';
import { TowerGame } from '../../models/TowerGame.interface';
import { emojis } from '../emojis';

function calculateGain(bet: number, floor: number) {
	return Math.ceil(bet * (1 + 0.1 * Math.pow(floor, 2)));
}

export function towerEmbed(grid: number[], history: number[], currentFloor: number, bet: number) {
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
		.setColor(0x360a5c)
		.setTitle('La Tour de la Fortune')
		.addFields(
			{ name: 'Mise', value: `${bet} ${emojis.rubies}`, inline: true },
			{ name: 'Gain actuel', value: `${currentFloor === 0 ? 0 : calculateGain(bet, currentFloor)} Rubis`, inline: true },
			{ name: 'Prochain gain', value: `${calculateGain(bet, currentFloor + 1)} Rubis`, inline: true }
		)
		.setDescription(`\`\`\`\n${towerVisual}\`\`\``);
}

export function towerEndEmbed(game: TowerGame, reason: 'win' | 'lose' | 'cashout', winAmount: number, badChoice?: number) {
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
		towerVisual += line + '\n';
	}

	const color = reason === 'lose' ? 0xff0000 : 0x00ff00;
	const title = reason === 'lose' ? "💥 BOUM ! C'est perdu." : '🎉 Partie terminée !';
	const desc =
		reason === 'lose' ? `Vous avez perdu votre mise de ${game.bet} ${emojis.rubies}.` : `Vous repartez avec **${winAmount} ${emojis.rubies}** !`;

	return new EmbedBuilder().setColor(color).setTitle(title).setDescription(`${desc}\n\`\`\`\n${towerVisual}\`\`\``);
}
