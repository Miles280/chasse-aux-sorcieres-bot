import { ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';

/**
 * Construit la ligne de boutons pour le jeu de la tour.
 * @param currentFloor - L'étage actuel (pour savoir si on affiche le bouton "Encaisser")
 */
export function buildTowerPlayAgainButton(discordId: string, bet: number): ActionRowBuilder<ButtonBuilder> {
	const row = new ActionRowBuilder<ButtonBuilder>();

	row.addComponents(
		new ButtonBuilder().setCustomId(`tower_playAgain_${discordId}_${bet}`).setLabel('Lancer une nouvelle partie').setStyle(ButtonStyle.Primary)
	);

	return row;
}
