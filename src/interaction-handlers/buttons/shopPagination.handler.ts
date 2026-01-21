import { ApplyOptions } from '@sapphire/decorators';
import { InteractionHandler, InteractionHandlerTypes, container } from '@sapphire/framework';
import { MessageFlags, type ButtonInteraction } from 'discord.js';
import { Currency } from '../../enums/Currency';
import * as Embeds from '../../utils/embeds';
import { ShopMessageBuilder } from '../../builders/ShopMessage.builder';

@ApplyOptions<InteractionHandler.Options>({
	interactionHandlerType: InteractionHandlerTypes.Button
})
export class ShopPaginationHandler extends InteractionHandler {
	public override parse(interaction: ButtonInteraction) {
		return interaction.customId.startsWith('shop_') ? this.some() : this.none();
	}

	public async run(interaction: ButtonInteraction) {
		// Ex: shop_next_gems_1
		const [, action, currencyRaw, currentPage] = interaction.customId.split('_');

		const currency = currencyRaw as Currency;
		let page = Number(currentPage);

		if (action === 'next') {
			page++;
		} else if (action === 'prev') {
			page--;
		}

		const response = await container.shopService.getArticles(currency, page);

		if (!response.success) {
			return interaction.reply({
				embeds: [Embeds.errorEmbed({ message: response.error })],
				flags: [MessageFlags.Ephemeral]
			});
		}

		const messageOptions = ShopMessageBuilder.build(currency, page, response.data);

		return interaction.reply({
			...messageOptions,
			flags: [MessageFlags.IsComponentsV2]
		});
	}
}
