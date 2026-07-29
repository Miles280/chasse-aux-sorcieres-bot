import { ApplyOptions } from '@sapphire/decorators';
import { Command, container } from '@sapphire/framework';
import { ChatInputCommandInteraction, InteractionContextType, MessageFlags, PermissionFlagsBits } from 'discord.js';
import * as Embeds from '../../utils/embeds';

@ApplyOptions<Command.Options>({
	name: 'clean-game',
	description: 'Supprime tous les channels de la partie et réinitialise les rôles.'
})
export class CleanGameCommand extends Command {
	public override registerApplicationCommands(registry: Command.Registry) {
		registry.registerChatInputCommand((builder) =>
			builder
				.setName(this.name)
				.setDescription(this.description)
				.setContexts([InteractionContextType.Guild])
				.setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels | PermissionFlagsBits.ManageRoles)
		);
	}

	public override async chatInputRun(interaction: ChatInputCommandInteraction) {
		await interaction.deferReply({ flags: [MessageFlags.Ephemeral] });

		const guild = interaction.guild!;

		// 1. Récupération de la configuration du serveur
		const configResponse = await container.serverConfigService.getConfig(guild.id);
		if (!configResponse.success) {
			return interaction.editReply({
				embeds: [Embeds.errorEmbed({ title: 'Erreur', message: 'Configuration introuvable.' })]
			});
		}
		const config = configResponse.data;

		// 2. Récupération de la partie active (avec ses joueurs)
		const gameResponse = await container.inGameService.getActiveGame();
		if (!gameResponse.success) {
			return interaction.editReply({
				embeds: [Embeds.errorEmbed({ title: 'Erreur', message: 'Aucune partie active trouvée.' })]
			});
		}
		const game = gameResponse.data;

		try {
			// A. NETTOYAGE DES SALONS
			const fetchedChannels = await guild.channels.fetch();
			const categoriesToClean = [config.gameCategoryId, config.gamePrivateCategoryId].filter(Boolean);
			const channelsToDelete = fetchedChannels.filter((channel) => channel && channel.parentId && categoriesToClean.includes(channel.parentId));

			for (const [_, channel] of channelsToDelete) {
				if (channel) {
					await channel.delete(`Nettoyage de partie par ${interaction.user.tag}`).catch(() => null);
				}
			}

			if (config.inscriptionChannelId) {
				const inscriptionChannel = fetchedChannels.get(config.inscriptionChannelId);
				if (inscriptionChannel && inscriptionChannel.isTextBased()) {
					await inscriptionChannel.bulkDelete(100, true).catch(() => null);
				}
			}

			// B. NETTOYAGE ET RESTAURATION DES RÔLES
			const rolesToRemove = [config.playerRoleId, config.deadPlayerRoleId, config.spectatorRoleId, config.invulnerabilityRoleId].filter(
				Boolean
			) as string[];

			// Déclaration du mapping des rôles staff
			const roleMap: Record<string, string | undefined> = {
				ROLE_MJ: config.mjRoleId ?? process.env.MJ_ROLE,
				ROLE_DEV: process.env.DEV_ROLE,
				ROLE_ADMIN: process.env.ADMIN_ROLE
			};

			// On boucle sur les joueurs inscrits dans la partie
			const gamePlayers = game.gamePlayers ?? [];

			for (const gamePlayer of gamePlayers) {
				const discordId = gamePlayer.user?.discordId;
				if (!discordId) continue;

				const member = await guild.members.fetch(discordId).catch(() => null);
				if (!member) continue;

				// 1. Retrait des rôles de partie
				const hasRoleToRemove = rolesToRemove.some((roleId) => member.roles.cache.has(roleId));
				if (hasRoleToRemove) {
					await member.roles.remove(rolesToRemove, 'Nettoyage de fin de partie').catch(() => null);
				}

				// 2. Restauration des rôles Staff pour ce joueur
				const rolesResponse = await container.usersService.getRoles(member.id);

				if (rolesResponse.success && rolesResponse.data) {
					const memberPerms = rolesResponse.data; // ex: ['ROLE_MJ', 'ROLE_ADMIN']

					for (const perm of memberPerms) {
						const discordRoleId = roleMap[perm];
						if (discordRoleId && !member.roles.cache.has(discordRoleId)) {
							await member.roles.add(discordRoleId, 'Restauration rôle Staff après partie').catch(() => null);
						}
					}
				}
			}

			// C. ATTRIBUTION DU RÔLE INVULNÉRABILITÉ NUIT 1
			const firstNightDeathsRes = await container.inGameService.getFirstNightDeaths(game.id);

			if (firstNightDeathsRes.success && config.invulnerabilityRoleId) {
				const deadPlayers = firstNightDeathsRes.data;

				for (const player of deadPlayers) {
					const member = await guild.members.fetch(player.user.discordId).catch(() => null);
					if (member) {
						await member.roles.add(config.invulnerabilityRoleId, 'Mort Nuit 1 - Invulnérabilité accordée').catch(() => null);
					}
				}
			}
		} catch (error) {
			container.logger.error(error);
			return interaction.editReply({
				embeds: [
					Embeds.errorEmbed({
						title: `Erreur`,
						message: 'Une erreur est survenue lors de la suppression des salons ou des rôles.'
					})
				]
			});
		}

		return interaction.editReply({
			embeds: [
				Embeds.successEmbed({
					title: `Nettoyage terminé !`,
					message: 'Les channels ont été supprimés et les rôles des joueurs ont été réinitialisés.'
				})
			]
		});
	}
}
