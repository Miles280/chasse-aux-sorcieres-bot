import { ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';

export function buildSellButtons() {
	return new ActionRowBuilder<ButtonBuilder>().addComponents(
		new ButtonBuilder().setCustomId(`sell`).setLabel('Vendre').setStyle(ButtonStyle.Primary)
	);
}
