import { ApplyOptions } from '@sapphire/decorators';
import { Command, container } from '@sapphire/framework';
import { ChatInputCommandInteraction, InteractionContextType, MessageFlags } from 'discord.js';
import * as Embeds from '../../utils/embeds';
import { emojis } from '../../utils/emojis';

@ApplyOptions<Command.Options>({
	name: 'kill',
	description: 'Tue un joueur de la partie en cours.'
})
export class KillCommand extends Command {
	public override registerApplicationCommands(registry: Command.Registry) {
		registry.registerChatInputCommand((builder) =>
			builder
				.setName(this.name)
				.setDescription(this.description)
				.setContexts([InteractionContextType.Guild])
				.addUserOption((opt) =>
					opt //
						.setName('joueur')
						.setDescription('Le joueur à tuer.')
						.setRequired(true)
				)
				.addStringOption((opt) =>
					opt //
						.setName('cause')
						.setDescription('La cause de la mort.')
						.addChoices(
							{ name: 'Votes du village', value: 'village_vote' },
							{ name: "Attaque d'une sorcière", value: 'witch_attack' },
							{ name: "Attaque d'un villageois", value: 'village_power' },
							{ name: "Attaque d'un indépendant", value: 'independent_attack' },
							{ name: 'Foudre divine', value: 'divine_lightning' }
						)
						.setRequired(true)
				)
				.addBooleanOption((opt) =>
					opt //
						.setName('role_cacher')
						.setDescription('Si le rôle doit être masquer aux joueurs ou non.')
				)
				.addStringOption((opt) =>
					opt //
						.setName('faux_role')
						.setDescription('Le nom du faux rôle à donner au joueur au moment de sa mort.')
						.setAutocomplete(true)
				)
		);
	}

	public override async chatInputRun(interaction: ChatInputCommandInteraction) {
		// 1. On diffère la réponse en éphémère (visible que par le MJ)
		// Indispensable car les requêtes API + modifications de rôles prennent du temps
		await interaction.deferReply({ flags: [MessageFlags.Ephemeral] });

		// 2. Récupération des arguments de la commande
		const targetUser = interaction.options.getUser('joueur', true);
		const cause = interaction.options.getString('cause', true);
		const hideRole = interaction.options.getBoolean('role_cacher') ?? false;
		const fakeRoleId = interaction.options.getString('faux_role');

		try {
			// 3. Récupérer la partie en cours pour ce serveur
			const activeGameResponse = await container.inGameService.getActiveGame();
			if (!activeGameResponse.success) {
				return interaction.editReply({
					embeds: [Embeds.errorEmbed({ title: 'Erreur', message: 'Aucune partie active trouvée sur ce serveur.' })]
				});
			}
			const game = activeGameResponse.data;

			// 4. Appel à ton API Symfony pour enregistrer le kill
			const killResponse = await container.inGameService.killPlayer(game.id, {
				discordId: targetUser.id,
				deathCause: cause,
				hideRole: hideRole,
				fakeRoleId: fakeRoleId ? Number(fakeRoleId) : null
			});

			if (!killResponse.success) {
				return interaction.editReply({
					embeds: [Embeds.errorEmbed({ title: 'Erreur API', message: killResponse.error })]
				});
			}

			// $gameData retourné par ton API Symfony
			const updatedGame = killResponse.data;

			// 5. GESTION DE LA PHASE : Si c'est l'aube, on s'arrête là (mise en attente)
			if (updatedGame.currentStep === 'dawn' || updatedGame.currentStep === 'night') {
				return interaction.editReply({
					embeds: [
						Embeds.successEmbed({
							title: 'Mort enregistrée',
							message: `La mort de <@${targetUser.id}> a bien été enregistrée.\n\nIl sera annoncé au petit matin.`
						})
					]
				});
			}

			// 6. SI ON N'EST PAS À L'AUBE : On applique les actions Discord immédiatement

			// Récupération de la config serveur
			const configResponse = await container.serverConfigService.getConfig(interaction.guildId!);
			if (!configResponse.success) {
				return interaction.editReply({
					embeds: [Embeds.errorEmbed({ title: 'Erreur Config', message: configResponse.error })]
				});
			}
			const config = configResponse.data;

			// Récupération du membre sur le serveur Discord
			const member = await interaction.guild?.members.fetch(targetUser.id);
			if (member) {
				// A. Swap des rôles (Vivant -> Mort)
				if (config.playerRoleId && config.deadPlayerRoleId) {
					await member.roles.remove(config.playerRoleId);
					await member.roles.add(config.deadPlayerRoleId);
				}

				// B. Move dans le channel vocal de l'Au-delà (Si le joueur est actuellement en vocal)
				if (member.voice.channelId && game.discordChannels['deadVoiceId']) {
					await member.voice.setChannel(game.discordChannels['deadVoiceId']);
				}
			}

			// C. Annonce dans le channel de vote
			const voteChannelId = updatedGame.discordChannels['votesChannelId'];
			if (voteChannelId) {
				const voteChannel = await interaction.guild?.channels.fetch(voteChannelId);
				if (voteChannel && voteChannel.isTextBased()) {
					const deadPlayerData = updatedGame.gamePlayers?.find((p: any) => p.user.discordId === targetUser.id);

					let roleText = '';
					if (hideRole) {
						roleText = 'Son rôle reste **secret**...';
					} else if (deadPlayerData?.revealedRole) {
						roleText = `Son rôle était **${deadPlayerData.revealedRole.name}**.`;
					} else {
						roleText = 'Son rôle est inconnu.';
					}

					// --- PERSONNALISATION DE LA PHRASE SELON LA CAUSE ---
					let title = '## ⚰️ Une tragédie a frappé le village...';
					let actionText = `${targetUser.toString()} a rendu l'âme`;

					if (cause === 'village_vote') {
						title = '## 🗳️ Le village a tranché !';
						actionText = `${targetUser.toString()} a été brûlé par le village`;
					} else if (cause === 'divine_lightning') {
						title = "## ⚡ La colère divine s'est abattue !";
						actionText = `${targetUser.toString()} a été foudroyé par les dieux`;
					}

					// Envoi de l'annonce
					await voteChannel.send({
						content: `${title}\n> ${emojis.dead} __${actionText} :__ ${roleText}`
					});
				}
			}

			// D. Mise à jour des Trackers (Appel de ta propre méthode de mise à jour)
			if (interaction.guild) {
				await container.inGameService.updateTrackers(interaction.guild, updatedGame);
			}

			// 7. Confirmation finale pour le MJ
			return interaction.editReply({
				embeds: [
					Embeds.successEmbed({
						title: 'Kill appliqué avec succès',
						message: `Le joueur ${targetUser.toString()} a été tué publiquement. Ses rôles ont été mis à jour et l'annonce a été envoyée.`
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
