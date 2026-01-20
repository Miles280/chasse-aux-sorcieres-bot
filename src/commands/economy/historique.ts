import { ApplyOptions } from '@sapphire/decorators';
import { Command, container } from '@sapphire/framework';
import { ChatInputCommandInteraction, InteractionContextType, MessageFlags } from 'discord.js';
import { HistoryMessageBuilder } from '../../builders/HistoryMessage.builder';
import * as Embeds from '../../utils/embeds';

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
				.setContexts([InteractionContextType.Guild])
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

		const response = await container.economyService.getHistory(discordId);

		// Gestion d'erreur AVANT le builder
		if (!response.success) {
			return interaction.reply({
				embeds: [Embeds.errorEmbed({ message: response.error })],
				flags: [MessageFlags.Ephemeral]
			});
		}

		const messageOptions = HistoryMessageBuilder.build(member, discordId, response.data);

		const messageRaw = await interaction.reply({ ...messageOptions, withResponse: true });
		const message = messageRaw.resource?.message ?? (await interaction.fetchReply());

		// Désactivation des composants du message au bout de 2min
		const collector = message.createMessageComponentCollector({
			time: 60_000 * 2
		});

		collector.on('end', async () => {
			try {
				// On reprend les options actuelles mais avec les composants désactivés
				const disabledComponents = HistoryMessageBuilder.disableComponents(messageOptions);

				await interaction.editReply({
					components: disabledComponents
				});
			} catch (error) {
				// On ignore l'erreur si le message a été supprimé entre temps
			}
		});
		return;
	}
}
