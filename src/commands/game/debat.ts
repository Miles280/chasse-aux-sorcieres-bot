import { ApplyOptions } from '@sapphire/decorators';
import { Command, container } from '@sapphire/framework';
import { ChatInputCommandInteraction, InteractionContextType, MessageFlags, PermissionFlagsBits, TextChannel } from 'discord.js';
import * as Embeds from '../../utils/embeds';

@ApplyOptions<Command.Options>({
	name: 'debat',
	description: 'Lance un chronomètre de débat, démute les joueurs, puis les remute à la fin.'
})
export class DebateCommand extends Command {
	public override registerApplicationCommands(registry: Command.Registry) {
		registry.registerChatInputCommand((builder) =>
			builder
				.setName(this.name)
				.setDescription(this.description)
				.setContexts([InteractionContextType.Guild])
				.setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels)
				.addIntegerOption((option) =>
					option.setName('temps').setDescription('Le temps du débat en minutes.').setRequired(true).setMinValue(1).setMaxValue(10)
				)
		);
	}

	public override async chatInputRun(interaction: ChatInputCommandInteraction) {
		await interaction.deferReply({ flags: [MessageFlags.Ephemeral] });

		const durationMinutes = interaction.options.getInteger('temps', true);
		const guild = interaction.guild!;

		// 1. Récupération de la partie
		const gameResponse = await container.inGameService.getActiveGame();
		if (!gameResponse.success || !gameResponse.data) {
			return interaction.editReply({
				embeds: [Embeds.errorEmbed({ title: 'Erreur', message: 'Aucune partie active trouvée.' })]
			});
		}
		const game = gameResponse.data;

		const voteChannelId = game.discordChannels['votesChannelId'];
		const voteChannel = voteChannelId ? (guild.channels.cache.get(voteChannelId) as TextChannel) : (interaction.channel as TextChannel);

		// 2. On lance la gestion du chrono en tâche de fond
		container.inGameService.runDebateTimeline(guild, voteChannel, game.gamePlayers ?? [], durationMinutes);

		// 3. Confirmation immédiate au MJ
		return interaction.editReply({
			embeds: [
				Embeds.successEmbed({
					title: 'Débat lancé !',
					message: `Le chrono de **${durationMinutes} minute(s)** est lancé. Les joueurs ont été démutés.`
				})
			]
		});
	}
}
