import { ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import { Currency } from '../../enums/Currency';
import { emojis } from '../emojis';

function getOppositeCurrency(currency: Currency): Currency {
	return currency === 'gems' ? Currency.RUBIES : Currency.GEMS;
}

export function buildShopButtons(currency: Currency, page: number, maxPage: number) {
	const opposite = getOppositeCurrency(currency);

	return new ActionRowBuilder<ButtonBuilder>().addComponents(
		new ButtonBuilder()
			.setCustomId(`shop_prev_${currency}_${page}`)
			.setLabel('◀️ Précédent')
			.setStyle(ButtonStyle.Secondary)
			.setDisabled(page <= 1),

		new ButtonBuilder()
			.setCustomId(`shop_next_${currency}_${page}`)
			.setLabel('Suivant ▶️')
			.setStyle(ButtonStyle.Secondary)
			.setDisabled(page >= maxPage),

		new ButtonBuilder()
			.setCustomId(`shop_currency_${opposite}_1`)
			.setEmoji(opposite === 'gems' ? emojis.gems : emojis.rubies)
			.setStyle(ButtonStyle.Secondary)
	);
}
