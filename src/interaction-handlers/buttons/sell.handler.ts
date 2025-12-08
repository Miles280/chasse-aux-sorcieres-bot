import { ApplyOptions } from '@sapphire/decorators';
import { InteractionHandler, InteractionHandlerTypes } from '@sapphire/framework';
import { ActionRowBuilder, ModalBuilder, TextInputBuilder, TextInputStyle, type ButtonInteraction } from 'discord.js';

@ApplyOptions<InteractionHandler.Options>({
	interactionHandlerType: InteractionHandlerTypes.Button
})
export class SellHandler extends InteractionHandler {
	public override parse(interaction: ButtonInteraction) {
		return interaction.customId.startsWith('sell') ? this.some() : this.none();
	}

	public async run(interaction: ButtonInteraction) {
		const modal = new ModalBuilder().setCustomId('sellModal').setTitle('Vendre un item');

		// 1 — Quel item ?
		const itemInput = new TextInputBuilder()
			.setCustomId('item')
			.setLabel('Quel item veux-tu vendre ?')
			.setPlaceholder('Ex : Arc d’onyx')
			.setStyle(TextInputStyle.Short)
			.setRequired(true);

		// 2 — À qui ?
		const targetInput = new TextInputBuilder()
			.setCustomId('target')
			.setLabel('À qui veux-tu vendre ? (ID Discord ou pseudo)')
			.setPlaceholder('Ex : @Miles')
			.setStyle(TextInputStyle.Short)
			.setRequired(true);

		// 3 — À combien ?
		const priceInput = new TextInputBuilder()
			.setCustomId('price')
			.setLabel('À quel prix ?')
			.setPlaceholder('Ex : 50')
			.setStyle(TextInputStyle.Short)
			.setRequired(true);

		// 4 — Avec quelle monnaie ?
		const currencyInput = new TextInputBuilder()
			.setCustomId('currency')
			.setLabel('Avec quelle monnaie ? (gemmes / rubis)')
			.setPlaceholder('gemmes ou rubis')
			.setStyle(TextInputStyle.Short)
			.setRequired(true);

		// Pack des rows
		const row1 = new ActionRowBuilder<TextInputBuilder>().addComponents(itemInput);
		const row2 = new ActionRowBuilder<TextInputBuilder>().addComponents(targetInput);
		const row3 = new ActionRowBuilder<TextInputBuilder>().addComponents(priceInput);
		const row4 = new ActionRowBuilder<TextInputBuilder>().addComponents(currencyInput);

		modal.addComponents(row1, row2, row3, row4);

		return interaction.showModal(modal);
	}
}
