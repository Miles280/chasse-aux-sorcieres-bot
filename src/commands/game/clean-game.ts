import { ApplyOptions } from '@sapphire/decorators';
import { Command, container } from '@sapphire/framework';
import { ChatInputCommandInteraction, InteractionContextType, MessageFlags, PermissionFlagsBits } from 'discord.js';
import * as Embeds from '../../utils/embeds';

@ApplyOptions<Command.Options>({
	name: 'clean-game',
	description: 'Supprime tout les channels lié à la partie en cours.'
})
export class CleanGameCommand extends Command {
	public override registerApplicationCommands(registry: Command.Registry) {
		registry.registerChatInputCommand((builder) =>
			builder
				.setName(this.name)
				.setDescription(this.description)
				.setContexts([InteractionContextType.Guild])
				.setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels)
		);
	}

	public override async chatInputRun(interaction: ChatInputCommandInteraction) {
		// 1. Diffère l'interaction
		await interaction.deferReply({ flags: [MessageFlags.Ephemeral] });

		// 2. Récupération des config depuis l'API
		const response = await container.serverConfigService.getConfig(interaction.guild!.id);

		if (!response.success) {
			return interaction.editReply({
				embeds: [Embeds.errorEmbed({ title: 'Erreur', message: 'Aucune inscription en cours.' })]
			});
		}

		const config = response.data;

		// 3. Suppression de tous les channels dans les deux catégories et des messages dans inscription
		try {
			// Récupération de tous les salons du serveur mis à jour
			const fetchedChannels = await interaction.guild!.channels.fetch();

			// A. Suppression des salons dans les catégories
			const categoriesToClean = [config.gameCategoryId, config.gamePrivateCategoryId].filter(Boolean);

			// On filtre les salons enfants de ces catégories
			const channelsToDelete = fetchedChannels.filter((channel) => channel && channel.parentId && categoriesToClean.includes(channel.parentId));

			// On supprime chaque salon un par un (le 'for...of' respecte mieux le rate-limit Discord)
			for (const [_, channel] of channelsToDelete) {
				if (channel) {
					await channel.delete(`Nettoyage de partie par ${interaction.user.tag}`).catch(() => null);
				}
			}

			// B. Nettoyage du salon d'inscription
			if (config.inscriptionChannelId) {
				const inscriptionChannel = fetchedChannels.get(config.inscriptionChannelId);

				// On vérifie que le salon existe et qu'il est textuel
				if (inscriptionChannel && inscriptionChannel.isTextBased()) {
					// bulkDelete prend un nombre (max 100). Le second paramètre 'true' ignore les messages de plus de 14 jours
					await inscriptionChannel.bulkDelete(100, true).catch((err) => {
						container.logger.error(`Impossible de bulkDelete dans inscription : ${err.message}`);
					});
				}
			}
		} catch (error) {
			return interaction.editReply({
				embeds: [
					Embeds.errorEmbed({
						title: `Erreur`,
						message: 'Une erreur est survenue lors de la suppression des salons.'
					})
				]
			});
		}

		return interaction.editReply({
			embeds: [
				Embeds.successEmbed({
					title: `Nettoyage terminé !`,
					message: 'Tout les channels de la partie ont été supprimés.'
				})
			]
		});
	}
}
