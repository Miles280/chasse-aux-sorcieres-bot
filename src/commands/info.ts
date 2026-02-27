import { ApplyOptions } from '@sapphire/decorators';
import { Subcommand } from '@sapphire/plugin-subcommands';
import { InteractionContextType, MessageFlags } from 'discord.js';
import { container } from '@sapphire/framework';
import * as Embeds from '../utils/embeds';

@ApplyOptions<Subcommand.Options>({
	name: 'info',
	description: 'Consulter différentes informations.',
	subcommands: [
		{ name: 'item', chatInputRun: 'chatInputItem' },
		{ name: 'conversion', chatInputRun: 'chatInputConversion' }
	]
})
export class InfoCommand extends Subcommand {
	public override registerApplicationCommands(registry: Subcommand.Registry) {
		registry.registerChatInputCommand((builder) =>
			builder
				.setName(this.name)
				.setDescription(this.description)
				.setContexts([InteractionContextType.Guild])
				.addSubcommand((sub) =>
					sub // ITEM
						.setName('item')
						.setDescription("Consulte les informations d'un item.")
						.addStringOption((opt) => opt.setName('item').setDescription("L'item concerné.").setAutocomplete(true).setRequired(true))
				)
				.addSubcommand((sub) =>
					sub // CONVERSION
						.setName('conversion')
						.setDescription('Consulte ton taux de conversion actuel.')
				)
		);
	}

	public async chatInputItem(interaction: Subcommand.ChatInputCommandInteraction) {
		const itemId = Number(interaction.options.getString('item'));

		const response = await container.shopService.getDetail(itemId);

		if (!response.success) {
			return interaction.reply({
				embeds: [Embeds.errorEmbed({ message: response.error })],
				flags: [MessageFlags.Ephemeral]
			});
		}

		const embed = Embeds.itemInfoEmbed(response.data);

		return interaction.reply({ embeds: [embed] });
	}

	public async chatInputConversion(interaction: Subcommand.ChatInputCommandInteraction) {
		const discordId = interaction.user.id;

		const response = await container.economyService.getConversionRate(discordId);

		if (!response.success) {
			return interaction.reply({
				embeds: [Embeds.errorEmbed({ message: response.error })],
				flags: [MessageFlags.Ephemeral]
			});
		}

		const member = await container.discordService.fetchMemberOrReply(interaction.guild, discordId, interaction);

		if (!member) return;

		return interaction.reply({
			embeds: [Embeds.conversionRateEmbed(member, response.data)]
		});
	}
}
