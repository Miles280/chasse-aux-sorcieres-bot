import { ApplyOptions } from '@sapphire/decorators';
import { Command, container } from '@sapphire/framework';
import { InteractionContextType, MessageFlags } from 'discord.js';
import { Currency } from '../../enums/Currency';
import { LeaderboardMessageBuilder } from '../../builders/economy-core/LeaderboardMessage.builder';
import * as Embeds from '../../utils/embeds';

@ApplyOptions<Command.Options>({
	name: 'classement',
	description: 'Consulte le classement des plus grandes richesses du serveur.'
})
export class ClassementCommand extends Command {
	public override registerApplicationCommands(registry: Command.Registry) {
		registry.registerChatInputCommand((builder) =>
			builder
				.setName(this.name)
				.setDescription(this.description)
				.setContexts([InteractionContextType.Guild])
				.addIntegerOption((opt) => opt.setName('page').setDescription('La page du classement à consulter.').setMinValue(1))
		);
	}

	public override async chatInputRun(interaction: Command.ChatInputCommandInteraction) {
		await interaction.deferReply();

		if (!interaction.guild) return;

		const page = interaction.options.getInteger('page') ?? 1;
		const defaultCurrency: Currency = Currency.RUBIES;

		// Récupération de tous les IDs des membres présents sur le serveur
		await interaction.guild.members.fetch();
		const memberIds = Array.from(interaction.guild.members.cache.keys());

		// Passage du tableau memberIds au service
		const response = await container.economyService.getLeaderboard(defaultCurrency, page, memberIds);

		if (!response.success) {
			return interaction.reply({
				embeds: [Embeds.errorEmbed({ message: response.error })],
				flags: [MessageFlags.Ephemeral]
			});
		}

		const messageOptions = LeaderboardMessageBuilder.build(defaultCurrency, page, response.data);

		return interaction.editReply({
			...messageOptions
		});
	}
}
