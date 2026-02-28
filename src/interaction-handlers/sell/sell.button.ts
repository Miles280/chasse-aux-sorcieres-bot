import { ApplyOptions } from '@sapphire/decorators';
import { container, InteractionHandler, InteractionHandlerTypes } from '@sapphire/framework';
import { MessageFlags, type ButtonInteraction } from 'discord.js';
import { Currency } from '../../enums/Currency';
import * as Embeds from '../../utils/embeds';

@ApplyOptions<InteractionHandler.Options>({
	interactionHandlerType: InteractionHandlerTypes.Button
})
export class SellHandler extends InteractionHandler {
	public override parse(interaction: ButtonInteraction) {
		return interaction.customId.startsWith('sell') ? this.some() : this.none();
	}

	public async run(interaction: ButtonInteraction) {
		// Ex: sell_accept_123456789_123456789_22_gems_55
		// sell_accept_${sellerId}_${buyerId}_${itemId}_${currency}_${price}
		const [, action, sellerId, buyerId, itemIdRaw, currencyRaw, priceRaw] = interaction.customId.split('_');

		const itemId = Number(itemIdRaw);
		const currency = currencyRaw as Currency;
		const price = Number(priceRaw);

		if (interaction.user.id !== buyerId) {
			return interaction.reply({
				embeds: [
					Embeds.errorEmbed({
						title: 'Espèce de petit voleur',
						message: "Elle n'est pas pour toi cette commande mon khey."
					})
				],
				flags: MessageFlags.Ephemeral
			});
		}

		if (action === 'deny') {
			return interaction.reply({
				embeds: [
					Embeds.errorEmbed({
						title: 'Achat refusé',
						message: `<@${buyerId}> a décidé d'annuler la vente.`
					})
				]
			});
		} else {
			const response = await container.inventoryService.tradeItem(sellerId, buyerId, itemId, currency, price);

			if (!response.success) {
				return interaction.reply({
					embeds: [Embeds.errorEmbed({ message: response.error })],
					flags: [MessageFlags.Ephemeral]
				});
			}

			const message = response.data.message;

			return interaction.reply({
				embeds: [
					Embeds.successEmbed({
						title: 'Achat réalisé avec succès',
						message: message ?? 'Action réussie'
					})
				]
			});
		}
	}
}
