import { ApplyOptions } from '@sapphire/decorators';
import { InteractionHandler, InteractionHandlerTypes, container } from '@sapphire/framework';
import { MessageFlags, type ButtonInteraction } from 'discord.js';
import { Currency } from '../../enums/Currency';

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

		const { components } = await container.shopService.buildShopView(currency, page);

		return interaction.update({
			components: components,
			flags: MessageFlags.IsComponentsV2
		});
	}
}
