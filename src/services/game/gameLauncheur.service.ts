import { ApiClient } from './../apiClient.service';
import { ApiResponse } from '../../models/ApiResponse.interface';
import { Guild, TextChannel, ChannelType, PermissionFlagsBits, OverwriteResolvable, ForumChannel } from 'discord.js';
import { container } from '@sapphire/framework';
import { ServerConfig } from '../../models/ServerConfig.interface';
import { GameData, RoleDistribution } from '../../models/Game.interface';
import { Alignment, getAlignmentLabel } from '../../enums/Alignment';
import { RoleMessageBuilder } from '../../builders/game/RoleMessage.builder';
import { InscriptionMessageBuilder } from '../../builders/game/InscriptionMessage.builder';
// import * as Embeds from '../../utils/embeds';

export class GameLauncherService {
	constructor(private api: ApiClient) {}

	// Cache temporaire pour les previews (Clé: gameId, Valeur: distribution)
	private previewCache = new Map<number, RoleDistribution[]>();

	// Permet de stocker la preview depuis la commande
	public setPreviewCache(gameId: number, distribution: RoleDistribution[]): void {
		this.previewCache.set(gameId, distribution);
	}

	// Permet de récupérer la preview (utile dans ton futur bouton de validation)
	public getPreviewCache(gameId: number): RoleDistribution[] | undefined {
		return this.previewCache.get(gameId);
	}

	// Pense à clean après le lancement !
	public clearPreviewCache(gameId: number): void {
		this.previewCache.delete(gameId);
	}

	/**
	 * Récupère une distribution temporaire sans la sauvegarder (Reroll / Preview)
	 */
	async getPreview(gameId: number): Promise<ApiResponse<{ gameId: number; distribution: RoleDistribution[] }>> {
		return await this.api.post<{ gameId: number; distribution: RoleDistribution[] }>(`/game/preview/${gameId}`, {});
	}

	/**
	 * Démarre la partie côté API et sauvegarde la distribution
	 */
	async startGame(gameId: number, distribution: RoleDistribution[] = []): Promise<ApiResponse<{ distribution: RoleDistribution[] }>> {
		return await this.api.post<{ distribution: RoleDistribution[] }>(`/game/start/${gameId}`, {
			distribution
		});
	}

	/**
	 * Le "Cerveau" qui orchestre le lancement complet (API + Actions Discord)
	 */
	async processLaunch(guild: Guild, game: GameData, validatedDistribution: RoleDistribution[] = [], gameMasterId: string): Promise<void> {
		// 1. Appel API pour officialiser le lancement
		const response = await this.startGame(game.id, validatedDistribution);

		if (!response.success) {
			// 🔥 AJOUTE CECI pour voir la vraie erreur Symfony dans ton terminal
			console.error('🔥 RÉPONSE API SYMFONY :', response);
			throw new Error(`L'API a refusé le lancement : ${response.error || 'Erreur inconnue'}`);
		}

		// Récupération de la configuration du serveur (pour les catégories parentes, rôles MJ, etc.)
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

					// On reconstruit le message avec l'état lancé
					const startedPayload = InscriptionMessageBuilder.buildStarted(game);
					await existingMessage.edit(startedPayload);
				}
			} catch (error) {
				console.error("Impossible de mettre à jour le message public au statut 'Started':", error);
			}
		}

		const finalDistribution = response.data.distribution;

		// 2. Création des channels et des fils (publique et privés)
		await this.setupGameChannels(guild, config, finalDistribution, gameMasterId); // <-- Ajout ici

		// await this.movePlayersToVoiceChannels(guild, finalDistribution, config, gameChannels.voiceChannel);

		// await this.sendTrackingMessages(gameChannels.publicTextChannel, gameId);
	}

	// =========================================================================
	// MÉTHODES PRIVÉES (Logique Discord)
	// =========================================================================

	/**
	 * Orchestre la création de tous les salons de la partie.
	 */
	private async setupGameChannels(guild: Guild, config: ServerConfig, distribution: RoleDistribution[], gameMasterId: string) {
		console.log('Création des salons de la partie...');

		const privateCategoryId = config.gamePrivateCategoryId;
		if (!privateCategoryId) {
			throw new Error("L'ID de la catégorie privée n'est pas configuré.");
		}

		// 1. Création du forum des rôles
		const rolesForum = await this.setupRolesForum(guild, privateCategoryId, distribution, config);

		// 2. Création des salons privés et distribution des rôles
		const privateChannels = await this.setupPrivateChannelsAndDistribute(guild, privateCategoryId, config.mjRoleId, distribution, gameMasterId);

		return {
			rolesForum,
			privateChannels
		};
	}

	/**
	 * Gère la création du Forum et des posts descriptifs pour chaque rôle.
	 */
	private async setupRolesForum(guild: Guild, categoryId: string, distribution: RoleDistribution[], config: ServerConfig): Promise<ForumChannel> {
		console.log('Création du forum des rôles...');

		// 1. Préparation des tags
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
				// Par défaut, on cache le salon à tout le monde (@everyone)
				id: guild.roles.everyone.id,
				deny: [PermissionFlagsBits.ViewChannel]
			}
		];

		// Rôles qui doivent LIRE UNIQUEMENT (Joueurs, Morts, Spectateurs)
		const readOnlyRoles = [config.playerRoleId, config.deadPlayerRoleId, config.spectatorRoleId].filter(Boolean) as string[]; // Filtre pour enlever les variables potentiellement undefined

		for (const roleId of readOnlyRoles) {
			permissionOverwrites.push({
				id: roleId,
				allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.ReadMessageHistory],
				deny: [
					PermissionFlagsBits.SendMessages, // Impossible de répondre à un post
					PermissionFlagsBits.CreatePublicThreads // Impossible de créer un nouveau post/rôle
				]
			});
		}

		// Permet au MJ d'avoir les pleins pouvoirs sur ce forum
		if (config.mjRoleId) {
			permissionOverwrites.push({
				id: config.mjRoleId,
				allow: [
					PermissionFlagsBits.ViewChannel,
					PermissionFlagsBits.SendMessages,
					PermissionFlagsBits.CreatePublicThreads,
					PermissionFlagsBits.ManageThreads,
					PermissionFlagsBits.ReadMessageHistory
				]
			});
		}

		// 2. Création du Forum
		const rolesForum = await guild.channels.create({
			name: '『📜』𝐑𝐨̂𝐥𝐞𝐬',
			type: ChannelType.GuildForum,
			parent: categoryId,
			availableTags: forumTags
		});

		// 3. Traitement des rôles (Uniques + Tri)
		const uniqueRoles = Array.from(new Map(distribution.map((d) => [d.role.name, d.role])).values());

		const campWeights: Record<string, number> = { witch: 1, villager: 2, independent: 3 };

		const sortedRoles = uniqueRoles.sort((a, b) => {
			const campA = a.camp?.toLowerCase() || 'villager';
			const campB = b.camp?.toLowerCase() || 'villager';

			if (campWeights[campA] !== campWeights[campB]) {
				return (campWeights[campA] || 99) - (campWeights[campB] || 99);
			}
			if (b.minPlayer !== a.minPlayer) {
				return b.minPlayer - a.minPlayer;
			}
			return a.name.localeCompare(b.name);
		});

		sortedRoles.reverse();

		// 4. Création des posts avec les tags
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

	/**
	 * Gère la création des salons privés des joueurs, leurs permissions, et l'annonce de leur rôle.
	 */
	private async setupPrivateChannelsAndDistribute(
		guild: Guild,
		categoryId: string,
		mjRoleId: string | null | undefined,
		distribution: RoleDistribution[],
		gameMasterId: string
	): Promise<Map<string, TextChannel>> {
		console.log('Création des salons privés et distribution...');

		const privateChannels = new Map<string, TextChannel>();

		for (const assignment of distribution) {
			const member = await guild.members.fetch(assignment.discordId).catch(() => null);
			if (!member) continue;

			const playerName = member.user.displayName;

			// 1. Configuration des permissions
			const permissionOverwrites: OverwriteResolvable[] = [
				{
					id: guild.id, // @everyone
					deny: [PermissionFlagsBits.ViewChannel]
				},
				{
					id: member.id, // Le joueur
					allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.PinMessages]
				}
			];

			if (mjRoleId) {
				permissionOverwrites.push({
					id: mjRoleId,
					allow: [PermissionFlagsBits.ViewChannel]
				});
			}

			// 2. Création du salon textuel privé
			const playerChannel = await guild.channels.create({
				name: `📜・${playerName}`,
				type: ChannelType.GuildText,
				parent: categoryId,
				permissionOverwrites
			});

			// 3. Distribution immédiate du rôle dans le salon
			const embed = RoleMessageBuilder.buildRoleEmbed(assignment.role);

			await playerChannel.send({
				content: `<@${assignment.discordId}> Voici ton rôle : `,
				embeds: [embed]
			});

			// 4. Création du Carnet (Thread public)
			const carnetThread = await playerChannel.threads.create({
				name: `Carnet de ${playerName}`,
				type: ChannelType.PublicThread
			});

			// Envoi du message dans le fil
			await carnetThread.send({
				content:
					`Salut <@${assignment.discordId}> !\n\n` +
					`Voici ton espace personnel pour cette partie. Tu peux y noter tout ce que tu veux : tes réflexions, tes suspicions, ou tes brouillons de messages.\n` +
					`-# Ton MJ pour cette partie est <@${gameMasterId}>.`
			});

			privateChannels.set(assignment.discordId, playerChannel);
		}

		return privateChannels;
	}

	// private async movePlayersToVoiceChannels(guild: Guild, distribution: RoleDistribution[], config: ServerConfig, targetVoiceChannel: VoiceChannel) {
	// 	console.log('Déplacement des joueurs...');

	// 	for (const assignment of distribution) {
	// 		const member = await guild.members.fetch(assignment.discordId).catch(() => null);
	// 		if (member && member.voice.channelId) {
	// 			await member.voice.setChannel(targetVoiceChannel);
	// 		}
	// 	}
	// }

	// private async sendTrackingMessages(publicChannel: TextChannel, gameId: number) {
	// 	console.log('Envoi du message de suivi public...');
	// 	// await publicChannel.send({ embeds: [Embeds.gameTrackerEmbed(gameId)] });
	// }
}
