import { SectionBuilder, SeparatorBuilder, SeparatorSpacingSize, TextDisplayBuilder, ButtonStyle } from 'discord.js';
import { emojisV2 } from '../../emojis';

export function buildShopItem(item: any, currency: string) {
	const separator = new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small);

	const section = new SectionBuilder()
		.addTextDisplayComponents(new TextDisplayBuilder().setContent(`**${item.name}**`))
		.addTextDisplayComponents(new TextDisplayBuilder().setContent(`-# Quantité disponible : ${item.quantity === null ? '∞' : item.quantity}`))
		.setButtonAccessory((btn) =>
			btn
				.setCustomId(`buy_${item.id}_${currency}`)
				.setLabel(`${item.price}`)
				.setEmoji(currency === 'gems' ? emojisV2.gems : emojisV2.rubies)
				.setStyle(ButtonStyle.Success)
		);

	return { separator, section };
}
