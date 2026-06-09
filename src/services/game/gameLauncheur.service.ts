import { ApiClient } from './../apiClient.service';
import { ApiResponse } from '../../models/ApiResponse.interface';
import { Guild, TextChannel, ChannelType, PermissionFlagsBits, OverwriteResolvable, ForumChannel } from 'discord.js';
import { container } from '@sapphire/framework';
import { ServerConfig } from '../../models/ServerConfig.interface';
import { GameData, RoleDistribution } from '../../models/Game.interface';
import { Alignment, getAlignmentLabel } from '../../enums/Alignment';
import { RoleMessageBuilder } from '../../builders/game/RoleMessage.builder';
import { InscriptionMessageBuilder } from '../../builders/game/InscriptionMessage.builder';

export class GameLauncherService {
	constructor(private api: ApiClient) {}

	private previewCache = new Map<number, RoleDistribution[]>();

	public setPreviewCache(gameId: number, distribution: RoleDistribution[]): void {
		this.previewCache.set(gameId, distribution);
	}

	public getPreviewCache(gameId: number): RoleDistribution[] | undefined {
		return this.previewCache.get(gameId);
	}

	public clearPreviewCache(gameId: number): void {
		this.previewCache.delete(gameId);
	}

	async getPreview(gameId: number): Promise<ApiResponse<{ gameId: number; distribution: RoleDistribution[] }>> {
		return await this.api.post<{ gameId: number; distribution: RoleDistribution[] }>(`/game/preview/${gameId}`, {});
	}

	async startGame(gameId: number, distribution: RoleDistribution[] = []): Promise<ApiResponse<{ distribution: RoleDistribution[] }>> {
		return await this.api.post<{ distribution: RoleDistribution[] }>(`/game/start/${gameId}`, { distribution });
	}

	/**
	 * 👑 NOUVELLE MÉTHODE : Envoie les salons à l'API Symfony pour sauvegarde
	 */
	async updateGameChannels(
		gameId: number,
		gameChannels: Record<string, string>,
		playersChannels: { discordId: string; channelId: string }[]
	): Promise<ApiResponse<any>> {
		// Si ton ApiClient ne gère pas le .patch(), tu peux le remplacer par .post() selon ton implémentation
		return await this.api.patch(`/game/${gameId}/channels`, {
			gameChannels,
			playersChannels
		});
	}

	/**
	 * Le "Cerveau" qui orchestre le lancement complet (API + Actions Discord)
	 */
	async processLaunch(guild: Guild, game: GameData, validatedDistribution: RoleDistribution[] = []): Promise<void> {
		// 1. Appel API pour officialiser le lancement
		const response = await this.startGame(game.id, validatedDistribution);

		if (!response.success) {
			throw new Error(`L'API a refusé le lancement : ${response.error || 'Erreur inconnue'}`);
		}

		const configResponse = await container.serverConfigService.getConfig(guild.id);
		if (!configResponse.success) {
			throw new Error('Configuration du serveur manquante.');
		}
		const config = configResponse.data;

		if (game.inscriptionMessageId && config.inscriptionChannelId) {
			try {
				const channel = await guild.channels.fetch(config.inscriptionChannelId);
				if (channel?.isTextBased()) {
					const existingMessage = await channel.messages.fetch(game.inscriptionMessageId);
					const startedPayload = InscriptionMessageBuilder.buildStarted(game);
					await existingMessage.edit(startedPayload);
				}
			} catch (error) {
				console.error("Impossible de mettre à jour le message public au statut 'Started':", error);
			}
		}

		const finalDistribution = response.data.distribution;

		// 2. Récupération des salons créés par Discord
		const { rolesForum, privateChannels } = await this.setupGameChannels(guild, config, finalDistribution);

		// 3. Formater les données pour l'API Symfony
		const playersChannelsPayload: { discordId: string; channelId: string }[] = [];
		privateChannels.forEach((channel, discordId) => {
			playersChannelsPayload.push({
				discordId: discordId,
				channelId: channel.id
			});
		});

		// Salons globaux de la partie (tu pourras y ajouter des salons vocaux ou de vote plus tard)
		const gameChannelsPayload = {
			rolesForumId: rolesForum.id
		};

		// 4. Envoi global à l'API Symfony
		const updateChannelsResponse = await this.updateGameChannels(game.id, gameChannelsPayload, playersChannelsPayload);

		if (!updateChannelsResponse.success) {
			console.error('🔥 ERREUR SAUVEGARDE SALONS SYMFONY :', updateChannelsResponse.error);
			// Optionnel : tu peux lever une erreur ici si c'est bloquant pour la suite
		}

		// Une fois tout terminé, on nettoie le cache temporaire
		this.clearPreviewCache(game.id);
	}

	// =========================================================================

	private async setupGameChannels(guild: Guild, config: ServerConfig, distribution: RoleDistribution[]) {
		const privateCategoryId = config.gamePrivateCategoryId;
		if (!privateCategoryId) {
			throw new Error("L'ID de la catégorie privée n'est pas configuré.");
		}

		const rolesForum = await this.setupRolesForum(guild, privateCategoryId, distribution, config);
		const privateChannels = await this.setupPrivateChannelsAndDistribute(guild, privateCategoryId, config.mjRoleId, distribution);

		return {
			rolesForum,
			privateChannels
		};
	}

	private async setupRolesForum(guild: Guild, categoryId: string, distribution: RoleDistribution[], config: ServerConfig): Promise<ForumChannel> {
		const forumTags: { name: string; emoji?: { name: string | null; id: string | null } }[] = [
			{ name: 'Sorcières' },
			{ name: 'Villageois' },
			{ name: 'Indépendants' }
		];

		for (const align of Object.values(Alignment)) {
			forumTags.push({ name: getAlignmentLabel(align) });
		}

		const permissionOverwrites: any[] = [
			{
				id: guild.roles.everyone.id,
				deny: [PermissionFlagsBits.ViewChannel]
			}
		];

		const readOnlyRoles = [config.playerRoleId, config.deadPlayerRoleId, config.spectatorRoleId].filter(Boolean) as string[];

		for (const roleId of readOnlyRoles) {
			permissionOverwrites.push({
				id: roleId,
				allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.ReadMessageHistory],
				deny: [PermissionFlagsBits.SendMessages, PermissionFlagsBits.SendMessagesInThreads, PermissionFlagsBits.CreatePublicThreads]
			});
		}

		if (config.mjRoleId) {
			permissionOverwrites.push({
				id: config.mjRoleId,
				allow: [
					PermissionFlagsBits.ViewChannel,
					PermissionFlagsBits.ReadMessageHistory,
					PermissionFlagsBits.SendMessages,
					PermissionFlagsBits.SendMessagesInThreads,
					PermissionFlagsBits.CreatePublicThreads,
					PermissionFlagsBits.ManageThreads
				]
			});
		}

		const rolesForum = await guild.channels.create({
			name: '『📜』𝐑𝐨̂𝐥𝐞𝐬',
			type: ChannelType.GuildForum,
			parent: categoryId,
			availableTags: forumTags,
			permissionOverwrites: permissionOverwrites
		});

		const uniqueRoles = Array.from(new Map(distribution.map((d) => [d.role.name, d.role])).values());
		const campWeights: Record<string, number> = { independent: 1, villagers: 2, witch: 3 };

		const sortedRoles = uniqueRoles.sort((a, b) => {
			const campA = a.camp?.toLowerCase() || 'villager';
			const campB = b.camp?.toLowerCase() || 'villager';

			if (campWeights[campA] !== campWeights[campB]) {
				return (campWeights[campA] || 99) - (campWeights[campB] || 99);
			}

			if (b.minPlayer !== a.minPlayer) {
				return b.minPlayer - a.minPlayer;
			}

			return b.name.localeCompare(a.name);
		});

		const tagsMap = new Map(rolesForum.availableTags.map((tag) => [tag.name, tag.id]));

		for (const role of sortedRoles) {
			const roleTagsIds: string[] = [];
			const camp = role.camp?.toLowerCase();
			let campTagName = 'Villageois';
			if (camp === 'witch') campTagName = 'Sorcières';
			if (camp === 'independent') campTagName = 'Indépendants';

			const campTagId = tagsMap.get(campTagName);
			if (campTagId) roleTagsIds.push(campTagId);

			if (role.alignments) {
				for (const alignment of role.alignments) {
					const alignTagId = tagsMap.get(getAlignmentLabel(alignment));
					if (alignTagId) roleTagsIds.push(alignTagId);
				}
			}

			const embed = RoleMessageBuilder.buildRoleEmbed(role);

			await rolesForum.threads.create({
				name: role.name,
				message: { embeds: [embed] },
				appliedTags: roleTagsIds
			});
		}

		return rolesForum;
	}

	private async setupPrivateChannelsAndDistribute(
		guild: Guild,
		categoryId: string,
		mjRoleId: string | null | undefined,
		distribution: RoleDistribution[]
	): Promise<Map<string, TextChannel>> {
		const privateChannels = new Map<string, TextChannel>();

		for (const assignment of distribution) {
			const member = await guild.members.fetch(assignment.discordId).catch(() => null);
			if (!member) continue;

			const playerName = member.user.displayName;

			const permissionOverwrites: OverwriteResolvable[] = [
				{
					id: guild.id,
					deny: [PermissionFlagsBits.ViewChannel]
				},
				{
					id: member.id,
					allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.PinMessages]
				}
			];

			if (mjRoleId) {
				permissionOverwrites.push({
					id: mjRoleId,
					allow: [PermissionFlagsBits.ViewChannel]
				});
			}

			const playerChannel = await guild.channels.create({
				name: `📜・${playerName}`,
				type: ChannelType.GuildText,
				parent: categoryId,
				permissionOverwrites
			});

			const embed = RoleMessageBuilder.buildRoleEmbed(assignment.role);

			const roleMessage = await playerChannel.send({
				content: `<@${assignment.discordId}> Voici ton rôle : `,
				embeds: [embed]
			});

			await roleMessage.pin();

			const carnetThread = await playerChannel.threads.create({
				name: `Carnet de ${playerName}`,
				type: ChannelType.PublicThread
			});

			await carnetThread.send({
				content:
					`Salut <@${assignment.discordId}> !\n\n` +
					`Voici ton espace personnel pour cette partie. Tu peux y noter tout ce que tu veux : tes réflexions, tes suspicions, ou tes brouillons de messages.`
			});

			// On stocke le salon créé associé au discordId du joueur
			privateChannels.set(assignment.discordId, playerChannel);
		}

		return privateChannels;
	}
}
