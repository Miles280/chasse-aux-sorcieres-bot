import { ApplyOptions } from '@sapphire/decorators';
import { Command } from '@sapphire/framework';
import { ComponentType, GuildMember, InteractionContextType, MessageFlags } from 'discord.js';
import { container } from '@sapphire/framework';
import { Currency } from '../../enums/Currency';
import * as Embeds from '../../utils/embeds';
import { SellMessageBuilder } from '../../builders/SellMessageBuilder';

@ApplyOptions<Command.Options>({
	name: 'sell',
	description: 'Vend un de tes items à un membre.'
})
export class SellCommand extends Command {
	public override registerApplicationCommands(registry: Command.Registry) {
		registry.registerChatInputCommand((builder) =>
			builder
				.setName(this.name)
				.setDescription(this.description)
				.setContexts([InteractionContextType.Guild])
				.addStringOption((opt) =>
					opt //
						.setName('item')
						.setDescription("L'item concerné par cette action.")
						.setAutocomplete(true)
						.setRequired(true)
				)
				.addUserOption((opt) =>
					opt //
						.setName('membre')
						.setDescription('Le membre concerné par cette action')
						.setRequired(true)
				)
				.addStringOption((opt) =>
					opt //
						.setName('monnaie')
						.setDescription('La monnaie avec laquelle vendre son item.')
						.addChoices({ name: 'Gemme', value: 'gems' }, { name: 'Rubis', value: 'rubies' })
						.setRequired(true)
				)
				.addNumberOption((opt) =>
					opt //
						.setName('valeur')
						.setDescription('Le montant de la vente.')
						.setMinValue(1)
						.setRequired(true)
				)
		);
	}

	public override async chatInputRun(interaction: Command.ChatInputCommandInteraction) {
		const seller = interaction.member as GuildMember;
		const buyer = interaction.options.getMember('membre') as GuildMember;
		const itemId = Number(interaction.options.getString('item'));
		const currency = interaction.options.getString('monnaie')! as Currency;
		const price = interaction.options.getNumber('valeur')!;

		if (seller.id === buyer.id) {
			return interaction.reply({
				embeds: [
					Embeds.errorEmbed({
						member: seller,
						title: 'Euuuh...',
						message: "Viens tu arrêtes d'être con ?\nNan parce que te vendre un item à toi-même..."
					})
				],
				flags: MessageFlags.Ephemeral
			});
		}

		const response = await container.shopService.getDetail(itemId);

		if (!response.success) {
			return interaction.reply({
				embeds: [Embeds.errorEmbed({ message: response.error })],
				flags: MessageFlags.Ephemeral
			});
		}

		const item = response.data;

		const messageOptions = SellMessageBuilder.build({
			seller,
			buyer,
			item,
			itemId,
			currency,
			price
		});

		const messageRaw = await interaction.reply({
			...messageOptions,
			withResponse: true
		});

		const message = messageRaw.resource!.message!;

		const collector = message.createMessageComponentCollector({
			componentType: ComponentType.Button,
			time: 60_000,
			filter: (i) => i.user.id === buyer.id
		});

		collector.on('collect', () => collector.stop('clicked'));

		collector.on('end', async (_collected, reason) => {
			const disabledComponents = SellMessageBuilder.disableComponents(messageOptions.components);

			await message.edit({ components: disabledComponents });

			if (reason === 'time') {
				await interaction.followUp({
					embeds: [
						Embeds.errorEmbed({
							title: 'Vente expirée',
							message: 'Le temps de réponse est écoulé.\nLa proposition a été automatiquement refusée.'
						})
					]
				});
			}
		});

		return;
	}
}
