import { ApiClient } from './../apiClient.service';
import { ApiResponse } from '../../models/ApiResponse.interface';
import { Guild, TextChannel, ChannelType, PermissionFlagsBits, OverwriteResolvable, ForumChannel } from 'discord.js';
import { container } from '@sapphire/framework';
import { ServerConfig } from '../../models/ServerConfig.interface';
import { GameData, RoleDistribution } from '../../models/Game.interface';
import { Alignment, getAlignmentLabel } from '../../enums/Alignment';
import { RoleMessageBuilder } from '../../builders/game/RoleMessage.builder';
import { InscriptionMessageBuilder } from '../../builders/game/InscriptionMessage.builder';
import { GameTrackerMessageBuilder } from '../../builders/game/GameTrackerBuilder';

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

	async viewGame(gameId: number): Promise<ApiResponse<GameData>> {
		return await this.api.get<GameData>(`/game/${gameId}`);
	}

	/**
	 * Envoie les salons à l'API Symfony pour sauvegarde
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
	 * Sauvegarde les messages de suivi
	 */
	async updateGameTrackers(gameId: number, publicTrackerMessageId: string | null, mjTrackerMessageId: string | null): Promise<ApiResponse<any>> {
		return await this.api.patch(`/game/${gameId}/trackersmessages`, {
			publicTrackerMessageId,
			mjTrackerMessageId
		});
	}

	/**
	 * Le "Cerveau" qui orchestre le lancement complet (API + Actions Discord)
	 */
	async processLaunch(guild: Guild, game: GameData, validatedDistribution: RoleDistribution[] = []): Promise<void> {
		// 1. Appel API pour officialiser le lancement
		const response = await this.startGame(game.id, validatedDistribution);

		if (!response.success) {
			throw new Error(`${response.error || 'Erreur inconnue'}`);
		}

		const refreshedGameRes = await this.viewGame(game.id);
		if (!refreshedGameRes.success || !refreshedGameRes.data) {
			throw new Error('Impossible de récupérer les données mises à jour de la partie.');
		}
		const updatedGame = refreshedGameRes.data;

		const configResponse = await container.serverConfigService.getConfig(guild.id);
		if (!configResponse.success) {
			throw new Error('Configuration du serveur manquante.');
		}
		const config = configResponse.data;

		if (updatedGame.inscriptionMessageId && config.inscriptionChannelId) {
			try {
				const channel = await guild.channels.fetch(config.inscriptionChannelId);
				if (channel?.isTextBased()) {
					const existingMessage = await channel.messages.fetch(updatedGame.inscriptionMessageId);
					const startedPayload = InscriptionMessageBuilder.buildStarted(updatedGame);
					await existingMessage.edit(startedPayload);
				}
			} catch (error) {
				console.error("Impossible de mettre à jour le message public au statut 'Started':", error);
			}
		}

		const finalDistribution = response.data.distribution;

		// On vérifie qu'on a bien une catégorie parente
		const categoryId = config.gameCategoryId;
		if (!categoryId) throw new Error('Catégorie de jeu non configurée.');

		const mjId: string = updatedGame.gameMaster.discordId;

		const spectatorIds: string[] = updatedGame.gamePlayers.filter((player) => player.isSpectator).map((player) => player.user.discordId);

		// 2. Création des vocaux et TP des joueurs ---
		const voiceChannels = await this.setupVoiceChannels(guild, config, categoryId, finalDistribution, spectatorIds, mjId);

		// 3. Récupération des salons privés et du forum créés par Discord
		const { rolesForum, privateChannels } = await this.setupPrivateCategory(guild, config, finalDistribution);

		// 4. Création des salons écrits de la game ---
		const textChannels = await this.setupTextChannels(guild, config, categoryId, finalDistribution);

		// 5. Envoie des messages de suivis de partie
		const trackingMessages = await this.sendTrackingMessages(guild, config, updatedGame, textChannels.votesChannel, updatedGame.compoMessageId);

		// 6. Formater les données pour l'API Symfony
		const playersChannelsPayload: { discordId: string; channelId: string }[] = [];
		privateChannels.forEach((channel, discordId) => {
			playersChannelsPayload.push({
				discordId: discordId,
				channelId: channel.id
			});
		});

		// Salons globaux de la partie
		const gameChannelsPayload: Record<string, string> = {
			rolesForumId: rolesForum.id,
			mainVoiceId: voiceChannels.mainVc.id,
			deadVoiceId: voiceChannels.deadVc.id,
			debatChannelId: textChannels.debatChannel.id,
			votesChannelId: textChannels.votesChannel.id,
			witchesChannelId: textChannels.witchesChannel.id,
			graveyardChannelId: textChannels.graveyardChannel.id
		};

		const ogreNainVc = textChannels.roleChannels.get('ogreNain');
		const fanatiqueVc = textChannels.roleChannels.get('fanatique');
		const conspirateurVc = textChannels.roleChannels.get('conspirateur');

		if (ogreNainVc) gameChannelsPayload.ogreNainChannelId = ogreNainVc.id;
		if (fanatiqueVc) gameChannelsPayload.fanatiqueChannelId = fanatiqueVc.id;
		if (conspirateurVc) gameChannelsPayload.conspirateurChannelId = conspirateurVc.id;

		// 7. Envoi des Channels à l'API Symfony
		const updateChannelsResponse = await this.updateGameChannels(updatedGame.id, gameChannelsPayload, playersChannelsPayload);

		if (!updateChannelsResponse.success) {
			throw new Error("Channels non sauvegardés auprès de l'API.");
		}

		// 8. Envoi des Trackers à l'API Symfony
		const updateTrackersResponse = await this.updateGameTrackers(
			updatedGame.id,
			trackingMessages.publicTrackerMessageId,
			trackingMessages.mjTrackerMessageId
		);

		if (!updateTrackersResponse.success) {
			throw new Error("⚠️ Les messages de suivis de partie n'ont pas pu être sauvegardés, mais la partie est lancée.");
		}

		// Une fois tout terminé, on nettoie le cache temporaire
		this.clearPreviewCache(updatedGame.id);
	}

	// =========================================================================

	/**
	 * Crée les vocaux et déplace les joueurs qui sont déjà en vocal sur le serveur
	 */
	private async setupVoiceChannels(
		guild: Guild,
		config: ServerConfig,
		categoryId: string,
		distribution: RoleDistribution[],
		spectatorIds: string[],
		mjId: string
	) {
		const everyoneId = guild.roles.everyone.id;
		const mjRoleId = config.mjRoleId;
		const playerRoleId = config.playerRoleId;
		const deadRoleId = config.deadPlayerRoleId;
		const specRoleId = config.spectatorRoleId;

		// 1. Vocal Principal (Vivants parlent, Morts/Specs écoutent)
		const mainVc = await guild.channels.create({
			name: '『⛲』𝐏𝐥𝐚𝐜𝐞 𝐏𝐮𝐛𝐥𝐢𝐪𝐮𝐞',
			type: ChannelType.GuildVoice,
			parent: categoryId,
			permissionOverwrites: [
				{
					id: everyoneId,
					deny: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.Connect]
				},
				{
					id: playerRoleId,
					allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.Connect, PermissionFlagsBits.Speak],
					deny: [
						PermissionFlagsBits.SendMessages,
						PermissionFlagsBits.Stream,
						PermissionFlagsBits.UseSoundboard,
						PermissionFlagsBits.UseEmbeddedActivities
					]
				},
				{
					id: deadRoleId,
					allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.Connect],
					deny: [
						PermissionFlagsBits.Speak,
						PermissionFlagsBits.SendMessages,
						PermissionFlagsBits.Stream,
						PermissionFlagsBits.UseSoundboard,
						PermissionFlagsBits.UseEmbeddedActivities
					]
				},
				{
					id: specRoleId,
					allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.Connect],
					deny: [
						PermissionFlagsBits.Speak,
						PermissionFlagsBits.SendMessages,
						PermissionFlagsBits.Stream,
						PermissionFlagsBits.UseSoundboard,
						PermissionFlagsBits.UseEmbeddedActivities
					]
				},
				{
					id: mjRoleId,
					allow: [
						PermissionFlagsBits.ViewChannel,
						PermissionFlagsBits.Connect,
						PermissionFlagsBits.Speak,
						PermissionFlagsBits.ManageChannels,
						PermissionFlagsBits.ManageRoles,
						PermissionFlagsBits.MuteMembers,
						PermissionFlagsBits.DeafenMembers,
						PermissionFlagsBits.MoveMembers,
						PermissionFlagsBits.PrioritySpeaker
					]
				}
			].filter(Boolean) as OverwriteResolvable[]
		});

		// 2. Vocal Cimetière (Morts/Specs parlent, Vivants bloqués)
		const deadVc = await guild.channels.create({
			name: `『👼』𝐋'𝐀𝐮-𝐝𝐞𝐥𝐚̀`,
			type: ChannelType.GuildVoice,
			parent: categoryId,
			permissionOverwrites: [
				{
					id: everyoneId,
					deny: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.Connect]
				},
				{
					id: playerRoleId,
					allow: [PermissionFlagsBits.ViewChannel],
					deny: [PermissionFlagsBits.Connect]
				},
				{
					id: deadRoleId,
					allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.Connect, PermissionFlagsBits.Speak],
					deny: [
						PermissionFlagsBits.SendMessages,
						PermissionFlagsBits.Stream,
						PermissionFlagsBits.UseSoundboard,
						PermissionFlagsBits.UseEmbeddedActivities
					]
				},
				{
					id: specRoleId,
					allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.Connect, PermissionFlagsBits.Speak],
					deny: [
						PermissionFlagsBits.SendMessages,
						PermissionFlagsBits.Stream,
						PermissionFlagsBits.UseSoundboard,
						PermissionFlagsBits.UseEmbeddedActivities
					]
				},
				{
					id: mjRoleId,
					allow: [
						PermissionFlagsBits.ViewChannel,
						PermissionFlagsBits.Connect,
						PermissionFlagsBits.Speak,
						PermissionFlagsBits.ManageChannels,
						PermissionFlagsBits.ManageRoles,
						PermissionFlagsBits.MuteMembers,
						PermissionFlagsBits.DeafenMembers,
						PermissionFlagsBits.MoveMembers,
						PermissionFlagsBits.PrioritySpeaker
					]
				}
			].filter(Boolean) as OverwriteResolvable[]
		});

		// --- Fonction utilitaire locale pour déplacer un membre ---
		const moveMemberToVc = async (discordId: string, targetChannel: any) => {
			const member = await guild.members.fetch(discordId).catch(() => null);
			if (member && member.voice.channelId) {
				try {
					await member.voice.setChannel(targetChannel);
				} catch (e) {
					console.error(`Impossible de move ${member.user.tag} :`, e);
				}
			}
		};

		// 3. Déplacement des Joueurs -> Place Publique
		for (const assignment of distribution) {
			await moveMemberToVc(assignment.discordId, mainVc);
		}

		// 4. Déplacement des Spectateurs -> L'Au-delà (ou mainVc si tu préfères)
		if (spectatorIds && spectatorIds.length > 0) {
			for (const specId of spectatorIds) {
				await moveMemberToVc(specId, deadVc);
			}
		}

		// 5. Déplacement du MJ -> Place Publique
		if (mjId) {
			await moveMemberToVc(mjId, mainVc);
		}

		return { mainVc, deadVc };
	}

	private async setupPrivateCategory(guild: Guild, config: ServerConfig, distribution: RoleDistribution[]) {
		const privateCategoryId = config.gamePrivateCategoryId;
		if (!privateCategoryId) {
			throw new Error("L'ID de la catégorie privée n'est pas configuré.");
		}

		const rolesForum = await this.setupRolesForum(guild, privateCategoryId, distribution, config);
		const privateChannels = await this.setupPrivateChannelsAndDistribute(guild, privateCategoryId, config.mjRoleId!, distribution);

		return {
			rolesForum,
			privateChannels
		};
	}

	/**
	 * Crée les salons textuels (Débat, Votes, Sorcières, Cimetière) avec les permissions complexes
	 */
	private async setupTextChannels(guild: Guild, config: ServerConfig, categoryId: string, distribution: RoleDistribution[]) {
		const everyoneId = guild.roles.everyone.id;
		const mjRoleId = config.mjRoleId;
		const playerRoleId = config.playerRoleId;
		const deadRoleId = config.deadPlayerRoleId;
		const specRoleId = config.spectatorRoleId;

		// Permissions de base pour Débat et Votes (Tous voient, seuls Vivants écrivent)
		const publicGameOverwrites: OverwriteResolvable[] = [
			{ id: everyoneId, deny: [PermissionFlagsBits.ViewChannel] },
			{ id: playerRoleId, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages] },
			{ id: deadRoleId, allow: [PermissionFlagsBits.ViewChannel], deny: [PermissionFlagsBits.SendMessages] },
			{ id: specRoleId, allow: [PermissionFlagsBits.ViewChannel], deny: [PermissionFlagsBits.SendMessages] },
			{
				id: mjRoleId,
				allow: [
					PermissionFlagsBits.ViewChannel,
					PermissionFlagsBits.SendMessages,
					PermissionFlagsBits.ManageChannels,
					PermissionFlagsBits.ManageMessages,
					PermissionFlagsBits.ManageRoles,
					PermissionFlagsBits.PinMessages
				]
			}
		].filter(Boolean) as OverwriteResolvable[];

		const debatChannel = await guild.channels.create({
			name: '『✒️』𝐃𝐞́𝐛𝐚𝐭-𝐄𝐜𝐫𝐢𝐭',
			type: ChannelType.GuildText,
			parent: categoryId,
			permissionOverwrites: publicGameOverwrites
		});

		const votesChannel = await guild.channels.create({
			name: '『📮』𝐕𝐨𝐭𝐞𝐬',
			type: ChannelType.GuildText,
			parent: categoryId,
			permissionOverwrites: publicGameOverwrites
		});

		// Salon Sorcières
		// On donne explicitement le droit de VOIR aux sorcières.
		// Le droit d'écrire sera dicté par leur rôle global (Joueur = oui, Mort = non).
		const witchesOverwrites: OverwriteResolvable[] = [
			{ id: everyoneId, deny: [PermissionFlagsBits.ViewChannel] },
			{ id: playerRoleId, allow: [PermissionFlagsBits.SendMessages] },
			{ id: deadRoleId, deny: [PermissionFlagsBits.SendMessages] },
			{
				id: mjRoleId,
				allow: [
					PermissionFlagsBits.ViewChannel,
					PermissionFlagsBits.SendMessages,
					PermissionFlagsBits.ManageChannels,
					PermissionFlagsBits.ManageMessages,
					PermissionFlagsBits.ManageRoles,
					PermissionFlagsBits.PinMessages
				]
			}
		].filter(Boolean) as OverwriteResolvable[];

		// On ajoute les sorcières dans les permissions
		const witches = distribution.filter((d) => d.role.camp === 'witch');
		for (const witch of witches) {
			witchesOverwrites.push({
				id: witch.discordId,
				allow: [PermissionFlagsBits.ViewChannel]
			});
		}

		const witchesChannel = await guild.channels.create({
			name: '『🧙』𝐒𝐨𝐫𝐜𝐢𝐞̀𝐫𝐞𝐬',
			type: ChannelType.GuildText,
			parent: categoryId,
			permissionOverwrites: witchesOverwrites
		});

		const roleChannels = await this.setupRoleSpecificChannels(guild, config, categoryId, distribution);

		// Cimetière textuel (Seuls les morts voient et écrivent, specs peuvent lire)
		const graveyardChannel = await guild.channels.create({
			name: '『💀』𝐂𝐢𝐦𝐞𝐭𝐢𝐞̀𝐫𝐞',
			type: ChannelType.GuildText,
			parent: categoryId,
			permissionOverwrites: [
				{ id: everyoneId, deny: [PermissionFlagsBits.ViewChannel] },
				{ id: playerRoleId, deny: [PermissionFlagsBits.ViewChannel] },
				{ id: deadRoleId, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages] },
				{ id: specRoleId, allow: [PermissionFlagsBits.ViewChannel], deny: [PermissionFlagsBits.SendMessages] },
				{
					id: mjRoleId,
					allow: [
						PermissionFlagsBits.ViewChannel,
						PermissionFlagsBits.SendMessages,
						PermissionFlagsBits.ManageChannels,
						PermissionFlagsBits.ManageMessages,
						PermissionFlagsBits.ManageRoles,
						PermissionFlagsBits.PinMessages
					]
				}
			].filter(Boolean) as OverwriteResolvable[]
		});

		return { debatChannel, votesChannel, witchesChannel, graveyardChannel, roleChannels };
	}

	/**
	 * Envoie les messages de tracking public et MJ
	 */
	private async sendTrackingMessages(
		guild: Guild,
		config: ServerConfig,
		game: GameData, // 🟢 Utilisation de GameData
		publicChannel: TextChannel,
		oldMessageIdToDelete: string | null = null
	) {
		let publicTrackerMessageId: string | null = null;
		let mjTrackerMessageId: string | null = null;

		// 1. Message public (dans débat-écrit par exemple)
		try {
			const publicContent = GameTrackerMessageBuilder.buildPlayerTrackerMessage(game);

			const publicMsg = await publicChannel.send({
				content: publicContent
			});

			publicTrackerMessageId = publicMsg.id;
			await publicMsg.pin();
		} catch (e) {
			console.error('Erreur envoi tracking public:', e);
		}

		// 2. Message MJ (dans le salon configuré)
		if (config.gameMjChannelId) {
			try {
				const mjChannel = await guild.channels.fetch(config.gameMjChannelId);

				if (mjChannel?.isTextBased()) {
					if (oldMessageIdToDelete) {
						try {
							const oldMessage = await mjChannel.messages.fetch(oldMessageIdToDelete);
							await oldMessage.delete();
						} catch {}
					}

					// APRÈS
					const mjEmbed = GameTrackerMessageBuilder.buildMJTrackerMessage(game);
					const mjMsg = await mjChannel.send({
						embeds: [mjEmbed]
					});

					mjTrackerMessageId = mjMsg.id;
				}
			} catch (e) {
				console.error('Erreur envoi tracking MJ:', e);
			}
		}

		return { publicTrackerMessageId, mjTrackerMessageId };
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
		mjRoleId: string,
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
				},
				{
					id: mjRoleId,
					allow: [
						PermissionFlagsBits.ViewChannel,
						PermissionFlagsBits.SendMessages,
						PermissionFlagsBits.ManageChannels,
						PermissionFlagsBits.ManageMessages,
						PermissionFlagsBits.ManageRoles,
						PermissionFlagsBits.PinMessages
					]
				}
			];

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

	private async setupRoleSpecificChannels(
		guild: Guild,
		config: ServerConfig,
		categoryId: string,
		distribution: RoleDistribution[]
	): Promise<Map<string, TextChannel>> {
		const everyoneId = guild.roles.everyone.id;
		const mjRoleId = config.mjRoleId;
		const playerRoleId = config.playerRoleId;
		const deadRoleId = config.deadPlayerRoleId;

		if (!playerRoleId || !deadRoleId || !mjRoleId) {
			throw new Error("Impossible de créer les salons de rôles : Les rôles 'Joueur' ou 'Mort' ou 'Animateur' ne sont pas configurés.");
		}

		const createdChannels = new Map<string, TextChannel>();

		const ogre = distribution.filter((d) => d.role.name === 'Ogre');
		const nain = distribution.filter((d) => d.role.name === 'Nain');
		const fanatique = distribution.filter((d) => d.role.name === 'Fanatique');
		const conspirateur = distribution.filter((d) => d.role.name === 'Conspirateur');

		// Cas A : Salon commun Ogre & Nain
		if (ogre.length > 0 || nain.length > 0) {
			const ogreNainOverwrites: OverwriteResolvable[] = [
				{ id: everyoneId, deny: [PermissionFlagsBits.ViewChannel] },
				{ id: playerRoleId, allow: [PermissionFlagsBits.SendMessages, PermissionFlagsBits.PinMessages] },
				{ id: deadRoleId, deny: [PermissionFlagsBits.SendMessages] },
				{
					id: mjRoleId,
					allow: [
						PermissionFlagsBits.ViewChannel,
						PermissionFlagsBits.SendMessages,
						PermissionFlagsBits.ManageChannels,
						PermissionFlagsBits.ManageMessages,
						PermissionFlagsBits.ManageRoles,
						PermissionFlagsBits.PinMessages
					]
				}
			];

			[...ogre, ...nain].forEach((player) => {
				ogreNainOverwrites.push({ id: player.discordId, allow: [PermissionFlagsBits.ViewChannel] });
			});

			// 🟢 ON STOCKE LE SALON ICI
			const channel = await guild.channels.create({
				name: '『👹⛏️』𝐎𝐠𝐫𝐞 & 𝐍𝐚𝐢𝐧',
				type: ChannelType.GuildText,
				parent: categoryId,
				permissionOverwrites: ogreNainOverwrites
			});

			// 🟢 ET ON L'AJOUTE À LA MAP
			createdChannels.set('ogreNain', channel);
		}

		// Cas B : Salon Fanatique
		if (fanatique.length > 0) {
			const fanatiqueOverwrites: OverwriteResolvable[] = [
				{ id: everyoneId, deny: [PermissionFlagsBits.ViewChannel] },
				{ id: deadRoleId, deny: [PermissionFlagsBits.SendMessages] },
				{
					id: mjRoleId,
					allow: [
						PermissionFlagsBits.ViewChannel,
						PermissionFlagsBits.SendMessages,
						PermissionFlagsBits.ManageChannels,
						PermissionFlagsBits.ManageMessages,
						PermissionFlagsBits.ManageRoles,
						PermissionFlagsBits.PinMessages
					]
				}
			];

			fanatique.forEach((player) => {
				fanatiqueOverwrites.push({ id: player.discordId, allow: [PermissionFlagsBits.ViewChannel] });
			});

			const channel = await guild.channels.create({
				name: '『🏮』𝐂𝐮𝐥𝐭𝐞-𝐝𝐮-𝐅𝐚𝐧𝐚𝐭𝐢𝐪𝐮𝐞',
				type: ChannelType.GuildText,
				parent: categoryId,
				permissionOverwrites: fanatiqueOverwrites
			});

			createdChannels.set('fanatique', channel);
		}

		// Cas C : Salon Conspirateur
		if (conspirateur.length > 0) {
			const conspirateurOverwrites: OverwriteResolvable[] = [
				{ id: everyoneId, deny: [PermissionFlagsBits.ViewChannel] },
				{ id: playerRoleId, allow: [PermissionFlagsBits.SendMessages] },
				{ id: deadRoleId, deny: [PermissionFlagsBits.SendMessages] },
				{
					id: mjRoleId,
					allow: [
						PermissionFlagsBits.ViewChannel,
						PermissionFlagsBits.SendMessages,
						PermissionFlagsBits.ManageChannels,
						PermissionFlagsBits.ManageMessages,
						PermissionFlagsBits.ManageRoles,
						PermissionFlagsBits.PinMessages
					]
				}
			];

			conspirateur.forEach((player) => {
				conspirateurOverwrites.push({ id: player.discordId, allow: [PermissionFlagsBits.ViewChannel] });
			});

			const channel = await guild.channels.create({
				name: '『📓』𝐔𝐫𝐧𝐞-𝐍𝐨𝐢𝐫',
				type: ChannelType.GuildText,
				parent: categoryId,
				permissionOverwrites: conspirateurOverwrites
			});

			createdChannels.set('conspirateur', channel);
		}

		return createdChannels;
	}
}
