import { ApplyOptions } from '@sapphire/decorators';
import { Command, container } from '@sapphire/framework';
import { ChatInputCommandInteraction, InteractionContextType, MessageFlags } from 'discord.js';
import { RoleMessageBuilder } from '../../builders/game/RoleMessage.builder';
import * as Embeds from '../../utils/embeds';

@ApplyOptions<Command.Options>({
	name: 'role',
	description: 'Consulte un rôle du jeu de la Chasse aux Sorcières.'
})
export class RoleCommand extends Command {
	public override registerApplicationCommands(registry: Command.Registry) {
		registry.registerChatInputCommand((builder) =>
			builder
				.setName(this.name)
				.setDescription(this.description)
				.setContexts([InteractionContextType.Guild])
				.addStringOption((opt) =>
					opt //
						.setName('nom')
						.setDescription('Le nom du rôle concerné.')
						.setAutocomplete(true)
						.setRequired(true)
				)
		);
	}

	public override async chatInputRun(interaction: ChatInputCommandInteraction) {
		const roleId = Number(interaction.options.getString('nom'));

		const response = await container.rolesService.getRole(roleId);
		if (!response.success) {
			return interaction.reply({
				embeds: [Embeds.errorEmbed({ title: 'Erreur de récupération du rôle', message: response.error })],
				flags: [MessageFlags.Ephemeral]
			});
		}

		const embed = RoleMessageBuilder.buildRoleEmbed(response.data);

		return interaction.reply({ embeds: [embed] });
	}
}
