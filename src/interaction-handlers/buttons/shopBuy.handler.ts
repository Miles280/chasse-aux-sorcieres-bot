import { ApplyOptions } from '@sapphire/decorators';
import { InteractionHandler, InteractionHandlerTypes, container } from '@sapphire/framework';
import { GuildMember, MessageFlags, type ButtonInteraction } from 'discord.js';
import * as Embeds from '../../utils/embeds';
import { Currency } from '../../enums/Currency';

@ApplyOptions<InteractionHandler.Options>({
	interactionHandlerType: InteractionHandlerTypes.Button
})
export class ShopPaginationHandler extends InteractionHandler {
	public override parse(interaction: ButtonInteraction) {
		return interaction.customId.startsWith('buy_') ? this.some() : this.none();
	}

	public async run(interaction: ButtonInteraction) {
		// Ex: buy_21_123456789_123456789_
		const [, id, requiredRoleId, grantedRoleId, currencyRaw, pageStr] = interaction.customId.split('_');
		const itemId = Number(id);
		const currency = currencyRaw as Currency;
		const page = Number(pageStr);

		// Vérifier que le membre a bien le rôle requis pour acheter l'article
		const member = interaction.member as GuildMember;
		if (requiredRoleId && requiredRoleId !== 'null' && !container.discordService.hasRole(member, requiredRoleId)) {
			return interaction.reply({
				embeds: [
					Embeds.errorEmbed({
						message: `Le rôle <@&${requiredRoleId}> est requis pour acheter cet article.`,
						member,
						title: 'Pas pour cette fois...'
					})
				],
				flags: MessageFlags.Ephemeral
			});
		}

		// Achat de l'article
		const response = await container.shopService.buyArticle(interaction.user.id, itemId);

		// Affichage de l'erreur si il y en as une
		if (response.error) {
			return interaction.reply({
				embeds: [Embeds.errorEmbed({ message: response.error, member: member, title: 'Pas pour cette fois...' })],
				flags: MessageFlags.Ephemeral
			});
		}

		// Ajout et suppression des rôles si besoin
		if (grantedRoleId && grantedRoleId !== 'null') {
			try {
				await member.roles.add(grantedRoleId, 'Achat dans la boutique');
				if (requiredRoleId && requiredRoleId !== 'null') {
					await member.roles.remove(requiredRoleId, 'Achat dans la boutique');
				}
			} catch (err) {
				console.error(`[ShopBuyHandler] Impossible d'ajouter le rôle :`, err);
			}
		}

		// await interaction.deferUpdate();

		const { components } = await container.shopService.buildShopView(currency, page);
		await interaction.update({ components: components, flags: MessageFlags.IsComponentsV2 });

		// Message finalde confirmation
		return interaction.followUp({
			embeds: [Embeds.successEmbed({ message: response.message!, member: member, title: 'Merci pour votre achat' })]
		});
	}
}
