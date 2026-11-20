import { ApplyOptions } from '@sapphire/decorators';
import { Command, container } from '@sapphire/framework';
import { ChatInputCommandInteraction, InteractionContextType, MessageFlags, PermissionFlagsBits } from 'discord.js';
import * as Embeds from '../../utils/embeds';

@ApplyOptions<Command.Options>({
	name: 'reveal',
	description: "Révèle le rôle d'un joueur dans la partie en cours."
})
export class RevealCommand extends Command {
	public override registerApplicationCommands(registry: Command.Registry) {
		registry.registerChatInputCommand((builder) =>
			builder
				.setName(this.name)
				.setDescription(this.description)
				.setContexts([InteractionContextType.Guild])
				.setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels)
				.addUserOption((opt) =>
					opt //
						.setName('joueur')
						.setDescription('Le joueur concerné par cette action.')
						.setRequired(true)
				)
				.addStringOption((opt) =>
					opt //
						.setName('fake')
						.setDescription('Le faux rôle sous lequel révéler le joueur.')
						.setAutocomplete(true)
				)
		);
	}

	public override async chatInputRun(interaction: ChatInputCommandInteraction) {
		await interaction.deferReply({ flags: [MessageFlags.Ephemeral] });

		const targetUser = interaction.options.getUser('joueur', true);
		const fakeRoleId = interaction.options.getString('fake');

		try {
			// Récupérer la partie en cours pour ce serveur
			const activeGameResponse = await container.inGameService.getActiveGame();
			if (!activeGameResponse.success) {
				return interaction.editReply({
					embeds: [Embeds.errorEmbed({ title: 'Erreur', message: 'Aucune partie active trouvée sur ce serveur.' })]
				});
			}
			const game = activeGameResponse.data;

			// Appel à l'API Symfony pour enregistrer le reveal (avec fakeRoleId)
			const revealResponse = await container.inGameService.revealPlayer(game.id, targetUser.id, fakeRoleId ? Number(fakeRoleId) : null);

			if (!revealResponse.success) {
				return interaction.editReply({
					embeds: [Embeds.errorEmbed({ title: 'Erreur API', message: revealResponse.error })]
				});
			}

			const updatedGame = revealResponse.data;

			// Récupération de la config serveur
			const configResponse = await container.serverConfigService.getConfig(interaction.guildId!);
			if (!configResponse.success) {
				return interaction.editReply({
					embeds: [Embeds.errorEmbed({ title: 'Erreur Config', message: configResponse.error })]
				});
			}

			// Annonce dans le channel de vote
			const voteChannelId = updatedGame.discordChannels['votesChannelId'];
			if (voteChannelId) {
				const voteChannel = await interaction.guild?.channels.fetch(voteChannelId);
				if (voteChannel && voteChannel.isTextBased()) {
					const revealPlayerData = updatedGame.gamePlayers?.find((p: any) => p.user.discordId === targetUser.id);

					const roleName = revealPlayerData?.revealedRole?.name ?? 'Inconnu';
					let roleText = `Son rôle est **${roleName}**.`;

					// --- PERSONNALISATION DE LA PHRASE ---
					let title = '## 👁️ Révélation !';
					let loreText = `L'identité secrète de l'un d'entre vous est tombée.`;
					let actionText = `${targetUser.toString()} a été révélé`;

					// Envoi de l'annonce
					await voteChannel.send({
						content: `${title}\n${loreText}\n\n> __${actionText}__ : ${roleText}`
					});
				}
			}

			// Mise à jour des Trackers
			if (interaction.guild) {
				await container.inGameService.updateTrackers(interaction.guild, updatedGame);
			}

			// Confirmation finale pour le MJ
			return interaction.editReply({
				embeds: [
					Embeds.successEmbed({
						title: 'Reveal appliqué avec succès',
						message: `Le joueur ${targetUser.toString()} a été révélé publiquement${fakeRoleId ? ' (sous un faux rôle)' : ''} et l'annonce a été envoyée.`
					})
				]
			});
		} catch (error) {
			container.logger.error(error);
			return interaction.editReply({
				embeds: [
					Embeds.errorEmbed({ title: 'Erreur fatale', message: "Une erreur inattendue est survenue lors de l'exécution de la commande." })
				]
			});
		}
	}
}
