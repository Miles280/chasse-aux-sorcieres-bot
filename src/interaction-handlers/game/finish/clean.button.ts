import { ApplyOptions } from '@sapphire/decorators';
import { InteractionHandler, InteractionHandlerTypes, container } from '@sapphire/framework';
import { ButtonInteraction, EmbedBuilder } from 'discord.js';
import * as Embeds from '../../../utils/embeds';
import { colors } from '../../../utils/customColors';

@ApplyOptions<InteractionHandler.Options>({
	interactionHandlerType: InteractionHandlerTypes.Button
})
export class CleanGameHandler extends InteractionHandler {
	public override parse(interaction: ButtonInteraction) {
		return interaction.customId.startsWith('game:clean:button:') ? this.some() : this.none();
	}

	public override async run(interaction: ButtonInteraction) {
		await interaction.deferUpdate();

		const [, , , gameId] = interaction.customId.split(':');
		const guild = interaction.guild!;

		// 1. Récupération de la configuration
		const configResponse = await container.serverConfigService.getConfig(guild.id);
		if (!configResponse.success) {
			return interaction.followUp({
				flags: ['Ephemeral'],
				embeds: [Embeds.errorEmbed({ title: 'Erreur', message: 'Configuration introuvable.' })]
			});
		}
		const config = configResponse.data;

		// 2. Récupération de la partie
		const gameResponse = await container.inGameService.getGameById(gameId);
		if (!gameResponse.success) {
			return interaction.followUp({
				flags: ['Ephemeral'],
				embeds: [Embeds.errorEmbed({ title: 'Erreur', message: 'Partie introuvable.' })]
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

			const roleMap: Record<string, string | undefined> = {
				ROLE_MJ: config.mjRoleId ?? process.env.MJ_ROLE,
				ROLE_DEV: process.env.DEV_ROLE,
				ROLE_ADMIN: process.env.ADMIN_ROLE
			};

			const gamePlayers = game.gamePlayers ?? [];

			for (const gamePlayer of gamePlayers) {
				const discordId = gamePlayer.user?.discordId;
				if (!discordId) continue;

				const member = await guild.members.fetch(discordId).catch(() => null);
				if (!member) continue;

				const hasRoleToRemove = rolesToRemove.some((roleId) => member.roles.cache.has(roleId));
				if (hasRoleToRemove) {
					await member.roles.remove(rolesToRemove, 'Nettoyage de fin de partie').catch(() => null);
				}

				const rolesResponse = await container.usersService.getRoles(member.id);

				if (rolesResponse.success && rolesResponse.data) {
					const memberPerms = rolesResponse.data;

					for (const perm of memberPerms) {
						const discordRoleId = roleMap[perm];
						if (discordRoleId && !member.roles.cache.has(discordRoleId)) {
							await member.roles.add(discordRoleId, 'Restauration rôle Staff après partie').catch(() => null);
						}
					}
				}
			}

			// C. ATTRIBUTION DE L'INVULNÉRABILITÉ NUIT 1
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

			// D. MISE À JOUR DU MESSAGE MJ
			const originalEmbed = EmbedBuilder.from(interaction.message.embeds[0]);

			originalEmbed.setColor(colors.success);
			originalEmbed.setFooter({ text: `Partie terminée et nettoyée.` });

			return interaction.editReply({
				embeds: [originalEmbed],
				components: []
			});
		} catch (error) {
			container.logger.error(error);
			return interaction.followUp({
				flags: ['Ephemeral'],
				embeds: [Embeds.errorEmbed({ title: `Erreur`, message: 'Une erreur est survenue lors de la suppression des salons ou des rôles.' })]
			});
		}
	}
}
