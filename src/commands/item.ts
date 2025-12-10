import { ApplyOptions } from '@sapphire/decorators';
import { Subcommand } from '@sapphire/plugin-subcommands';
import { GuildMember, InteractionContextType, MessageFlags } from 'discord.js';
import { container } from '@sapphire/framework';
import * as Embeds from '../utils/embeds';
import { Currency } from '../enums/Currency';

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
		const item = Number(interaction.options.getString('item'));

		// Demande à l'API les informations de l'inventaire du membre
		const response = await container.shopService.getDetail(item);
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
		const senderId = interaction.user.id;
		const receiverId = interaction.options.getUser('membre')!.id;
		const itemId = interaction.options.getString('item')!;
		const currency = interaction.options.getString('monnaie')! as Currency;
		const amount = interaction.options.getNumber('valeur')!;

		return interaction.reply({ content: `${senderId}, ${receiverId}, ${itemId}, ${currency}, ${amount}` });
	}
}
