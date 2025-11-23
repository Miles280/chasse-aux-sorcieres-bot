import { EmbedBuilder } from 'discord.js';
import { ShopView } from '../../models/Shop';

export function createShopEmbed(shopData: ShopView) {
	const embed = new EmbedBuilder()
		.setTitle(`Boutique de Nistrium`)
		.setColor('#360a5c')
		.setFooter({ text: `Page ${shopData.page}/${shopData.pages}` })
		.setTimestamp();

	shopData.items.forEach((item, index) => {
		embed.addFields({
			name: `${index + 1}. ${item.name} (${item.price} ${item.currency})`,
			value: item.description
		});
	});

	return embed;
}
