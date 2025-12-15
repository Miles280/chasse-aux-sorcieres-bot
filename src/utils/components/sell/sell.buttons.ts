import { ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';

export function buildSellButtons({
	sellerId,
	buyerId,
	itemId,
	price,
	currency
}: {
	sellerId: string;
	buyerId: string;
	itemId: number;
	price: number;
	currency: 'gems' | 'rubies';
}) {
	return new ActionRowBuilder<ButtonBuilder>().addComponents(
		new ButtonBuilder()
			.setCustomId(`sell_accept_${sellerId}_${buyerId}_${itemId}_${currency}_${price}`)
			.setLabel('Accepter')
			.setStyle(ButtonStyle.Success),

		new ButtonBuilder()
			.setCustomId(`sell_deny_${sellerId}_${buyerId}_${itemId}_${currency}_${price}`)
			.setLabel('Refuser')
			.setStyle(ButtonStyle.Danger)
	);
}
