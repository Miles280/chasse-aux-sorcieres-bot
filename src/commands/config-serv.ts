import { ApplyOptions } from '@sapphire/decorators';
import { Command, container } from '@sapphire/framework';
import { ChatInputCommandInteraction, InteractionContextType, MessageFlags, PermissionFlagsBits } from 'discord.js';
import { ServerConfigMessageBuilder } from '../builders/ServerConfigMessage.builder';
import * as Embeds from '../utils/embeds';

@ApplyOptions<Command.Options>({
	name: 'config-serv',
	description: 'Ouvre le panneau de configuration du bot.'
})
export class ConfigCommand extends Command {
	public override registerApplicationCommands(registry: Command.Registry) {
		registry.registerChatInputCommand((builder) =>
			builder
				.setName(this.name)
				.setDescription(this.description)
				.setContexts([InteractionContextType.Guild])
				.setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
		);
	}

	public override async chatInputRun(interaction: ChatInputCommandInteraction) {
		if (!interaction.guildId) return;

		await interaction.deferReply({ flags: [MessageFlags.Ephemeral] });

		const response = await container.serverConfigService.getConfig(interaction.guildId);

		if (!response.success) {
			return interaction.editReply({
				embeds: [Embeds.errorEmbed({ title: 'Erreur', message: "Impossible de joindre l'API." })]
			});
		}

		const messageOptions = ServerConfigMessageBuilder.build(response.data);

		return interaction.editReply({
			...messageOptions,
			flags: [MessageFlags.IsComponentsV2]
		});
	}
}
