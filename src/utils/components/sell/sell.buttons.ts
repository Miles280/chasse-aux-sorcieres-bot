import { ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';

export function buildSellButtons() {
	return new ActionRowBuilder<ButtonBuilder>().addComponents(
		new ButtonBuilder().setCustomId(`sell_accept`).setLabel('Accepter').setStyle(ButtonStyle.Primary),
		new ButtonBuilder().setCustomId(`sell_deny`).setLabel('Refuser').setStyle(ButtonStyle.Danger)
	);
}
