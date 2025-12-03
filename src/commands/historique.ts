import { ApplyOptions } from '@sapphire/decorators';
import { Command, container } from '@sapphire/framework';
import { ChatInputCommandInteraction } from 'discord.js';
import { disableComponentsAfter } from '../utils/disableComponents';

@ApplyOptions<Command.Options>({
	name: 'historique',
	description: 'Consulte ton historique de transaction ou celle d’un membre.'
})
export class HistoriqueCommand extends Command {
	public override registerApplicationCommands(registry: Command.Registry) {
		registry.registerChatInputCommand((builder) =>
			builder
				.setName(this.name)
				.setDescription(this.description)
				.addUserOption((option) =>
					option //
						.setName('membre')
						.setDescription('Le membre concerné par cette action.')
				)
		);
	}

	public override async chatInputRun(interaction: ChatInputCommandInteraction) {
		const requestedUser = interaction.options.getUser('membre');
		const discordId = requestedUser?.id ?? interaction.user.id;

		// Vérification que le membre est sur le serveur (pour pouvoir afficher l'utilisateur dans l'embed)
		const member = await container.discordService.fetchMemberOrReply(interaction.guild, discordId, interaction);
		if (!member) return;

		const response = await container.economyService.buildHistoryMessage(member, discordId, 1, []);
		const sentMessage = await interaction.reply({ ...response });
		disableComponentsAfter(sentMessage, response.components, 2);
	}
}
