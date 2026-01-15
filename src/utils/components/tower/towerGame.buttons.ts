import { ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';

/**
 * Construit la ligne de boutons pour le jeu de la tour.
 * @param currentFloor - L'étage actuel (pour savoir si on affiche le bouton "Encaisser")
 */
export function buildTowerButtons(currentFloor: number): ActionRowBuilder<ButtonBuilder> {
	const row = new ActionRowBuilder<ButtonBuilder>();

	// 1. Les trois boutons de choix (Mystère)
	for (let i = 0; i < 3; i++) {
		row.addComponents(
			new ButtonBuilder()
				.setCustomId(`tower_play_${i}`)
				.setLabel('❓') // Changer l'emoji ici
				.setStyle(ButtonStyle.Secondary)
		);
	}

	// 2. Le bouton "Encaisser" (Uniquement si on a passé au moins l'étage 0)
	if (currentFloor > 0) {
		row.addComponents(new ButtonBuilder().setCustomId(`tower_stop`).setLabel('💰 Encaisser').setStyle(ButtonStyle.Success));
	}

	return row;
}
