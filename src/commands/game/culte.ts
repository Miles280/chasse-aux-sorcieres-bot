import { ApplyOptions } from '@sapphire/decorators';
import { Command, container } from '@sapphire/framework';
import { ChatInputCommandInteraction, InteractionContextType, MessageFlags, PermissionFlagsBits } from 'discord.js';
import { GameMessageBuilder } from '../../builders/game/GameMessage.builder';
import * as Embeds from '../../utils/embeds';

@ApplyOptions<Command.Options>({
	name: 'culte',
	description: 'Ouvre le sélecteur pour ajouter des joueurs au Culte du Fanatique.'
})
export class CulteCommand extends Command {
	public override registerApplicationCommands(registry: Command.Registry) {
		registry.registerChatInputCommand((builder) => {
			builder
				.setName(this.name)
				.setDescription(this.description)
				.setContexts([InteractionContextType.Guild])
				.setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels);
		});
	}

	public override async chatInputRun(interaction: ChatInputCommandInteraction) {
		await interaction.deferReply({ flags: [MessageFlags.Ephemeral] });

		try {
			// 1. Récupérer la partie en cours
			const activeGameResponse = await container.inGameService.getActiveGame();
			if (!activeGameResponse.success || !activeGameResponse.data) {
				return interaction.editReply({
					embeds: [Embeds.errorEmbed({ title: 'Erreur', message: 'Aucune partie active trouvée sur ce serveur.' })]
				});
			}
			const game = activeGameResponse.data;

			// 2. Vérifier la présence de joueurs dans la partie
			const players = game.gamePlayers ?? [];
			if (players.length === 0) {
				return interaction.editReply({
					embeds: [Embeds.errorEmbed({ title: 'Aucun joueur', message: 'Aucun joueur trouvé dans la partie en cours.' })]
				});
			}

			const alivePlayers = players.filter((p: any) => p.isAlive && !p.isSpectator);

			// 3. Mettre à jour le cache des membres pour afficher les pseudos dans le sélecteur
			if (!interaction.guild) {
				return interaction.editReply({
					embeds: [Embeds.errorEmbed({ title: 'Erreur', message: 'Cette commande doit être utilisée sur un serveur.' })]
				});
			}

			await interaction.guild.members.fetch().catch(() => null);

			// 4. Envoyer le message avec le sélecteur de joueurs
			return interaction.editReply({
				...GameMessageBuilder.buildCulte(alivePlayers, interaction.guild)
			});
		} catch (error) {
			container.logger.error(error);
			return interaction.editReply({
				embeds: [
					Embeds.errorEmbed({
						title: 'Erreur fatale',
						message: "Une erreur inattendue est survenue lors de l'exécution de la commande."
					})
				],
				components: []
			});
		}
	}
}
