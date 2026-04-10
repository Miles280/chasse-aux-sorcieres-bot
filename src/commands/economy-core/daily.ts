import { ApplyOptions } from '@sapphire/decorators';
import { Command, container } from '@sapphire/framework';
import { ChatInputCommandInteraction, InteractionContextType, MessageFlags } from 'discord.js';
import * as Embeds from '../../utils/embeds';

@ApplyOptions<Command.Options>({
	name: 'daily',
	description: 'Récupère ta récompense journalière.'
})
export class DailyCommand extends Command {
	public override registerApplicationCommands(registry: Command.Registry) {
		registry.registerChatInputCommand((builder) =>
			builder.setName(this.name).setDescription(this.description).setContexts([InteractionContextType.Guild])
		);
	}

	public override async chatInputRun(interaction: ChatInputCommandInteraction) {
		const discordId = interaction.user.id;

		// Vérification que le membre est sur le serveur (pour pouvoir afficher l'utilisateur dans l'embed)
		const member = await container.discordService.fetchMemberOrReply(interaction.guild, discordId, interaction);
		if (!member) return;

		const response = await container.economyService.daily(discordId);

		// Gestion d'erreur
		if (!response.success) {
			return interaction.reply({
				embeds: [Embeds.errorEmbed({ title: 'Pas encore...', message: response.error })],
				flags: [MessageFlags.Ephemeral]
			});
		}

		const embed = Embeds.dailyEmbed(response.data);

		return interaction.reply({ embeds: [embed] });
	}
}
