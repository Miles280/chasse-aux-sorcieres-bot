import { ApplyOptions } from '@sapphire/decorators';
import { Subcommand } from '@sapphire/plugin-subcommands';
import { ActionRowBuilder, ButtonBuilder, ComponentType, GuildMember, InteractionContextType, MessageFlags } from 'discord.js';
import { container } from '@sapphire/framework';
import { Currency } from '../../enums/Currency';
import * as Embeds from '../../utils/embeds';
import * as Components from '../../utils/components';

@ApplyOptions<Subcommand.Options>({
	name: 'item',
	description: 'Gestion des items.',
	subcommands: [
		{ name: 'info', chatInputRun: 'chatInputInfo' },
		{ name: 'sell', chatInputRun: 'chatInputSell' }
	]
})
export class itemCommand extends Subcommand {
	public override registerApplicationCommands(registry: Subcommand.Registry) {
		registry.registerChatInputCommand((builder) =>
			builder //
				.setName(this.name)
				.setDescription(this.description)
				.setContexts([InteractionContextType.Guild])
				.addSubcommand((sub) =>
					sub // INFO
						.setName('info')
						.setDescription("Consulte les informations d'un item.")
						.addStringOption((opt) =>
							opt //
								.setName('item')
								.setDescription("L'item concerné par cette action.")
								.setAutocomplete(true)
								.setRequired(true)
						)
				)
				.addSubcommand((sub) =>
					sub // SELL
						.setName('sell')
						.setDescription('Vend un de tes items à un membre.')
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
								.setDescription('La monnaie avec laquel vendre son item.')
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
				)
		);
	}

	public async chatInputInfo(interaction: Subcommand.ChatInputCommandInteraction) {
		const itemId = Number(interaction.options.getString('item'));

		// Demande à l'API les informations de l'inventaire du membre
		const response = await container.shopService.getDetail(itemId);
		if (response.error) {
			await interaction.reply({
				embeds: [Embeds.errorEmbed({ member: interaction.member as GuildMember, message: response.error })],
				flags: MessageFlags.Ephemeral
			});
			return;
		}

		// Création et envoie de l'embed final
		const embed = Embeds.itemInfoEmbed(response.item!);

		await interaction.reply({
			embeds: [embed]
		});
	}

	public async chatInputSell(interaction: Subcommand.ChatInputCommandInteraction) {
		const seller = interaction.member as GuildMember;
		const buyer = interaction.options.getMember('membre') as GuildMember;
		const itemId = Number(interaction.options.getString('item'));
		const currency = interaction.options.getString('monnaie')! as Currency;
		const price = interaction.options.getNumber('valeur')!;

		if (seller === buyer) {
			return interaction.reply({
				embeds: [
					Embeds.errorEmbed({
						member: seller,
						title: 'Euuuh...',
						message: "Viens tu arrêtes d'être con ?\n Nan parce que te vendre un item à toi-même..."
					})
				],
				flags: MessageFlags.Ephemeral
			});
		}

		const response = await container.shopService.getDetail(itemId);

		if (response.error || !response.item) {
			return interaction.reply({
				embeds: [Embeds.errorEmbed({ member: seller, title: 'Vente annulée', message: response.error ?? 'Impossible de trouver cet item.' })],
				flags: MessageFlags.Ephemeral
			});
		}

		const item = response.item;

		const embed = Embeds.sellProposalEmbed({ seller, buyer, item, currency, price });

		const messageRaw = await interaction.reply({
			content: `<@${buyer.id}> Une opportunité s'offre à toi.`,
			embeds: [embed],
			components: [Components.buildSellButtons({ sellerId: seller.id, buyerId: buyer.id, itemId, currency, price })],
			withResponse: true
		});

		const message = messageRaw.resource!.message!;

		const collector = message.createMessageComponentCollector({
			componentType: ComponentType.Button,
			time: 60_000 * 1,
			filter: (i) => i.user.id === buyer.id
		});

		collector.on('collect', () => {
			collector.stop('clicked');
		});

		collector.on('end', async (_collected, reason) => {
			const row = Components.buildSellButtons({
				sellerId: seller.id,
				buyerId: buyer.id,
				itemId,
				currency,
				price
			});

			// Désactiver chaque bouton
			const disabledRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
				row.components.map((button) => ButtonBuilder.from(button).setDisabled(true))
			);

			await message.edit({ components: [disabledRow] });

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
