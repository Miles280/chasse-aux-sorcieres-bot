import { ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';

export function buildHistoryButtons(discordId: string, page: number, maxPage: number, types: string[]) {
	return new ActionRowBuilder<ButtonBuilder>().addComponents(
		new ButtonBuilder()
			.setCustomId(`history_prev_${discordId}_${page}_${types.join(',')}`)
			.setLabel('◀️ Précédent')
			.setStyle(ButtonStyle.Secondary)
			.setDisabled(page <= 1),
		new ButtonBuilder()
			.setCustomId(`history_next_${discordId}_${page}_${types.join(',')}`)
			.setLabel('Suivant ▶️')
			.setStyle(ButtonStyle.Secondary)
			.setDisabled(page >= maxPage)
	);
}
