import { ApiClient } from './../apiClient.service';
import { ApiResponse } from '../../models/ApiResponse.interface';
import { GameData } from '../../models/Game.interface';
import { ButtonInteraction, GuildTextBasedChannel, MessageFlags } from 'discord.js';
import { InscriptionMessageBuilder } from '../../builders/game/InscriptionMessage.builder';
import { container } from '@sapphire/framework';
import { ServerConfig } from '../../models/ServerConfig.interface';
import { InscriptionAction, InscriptionInteractionContext } from '../../models/Inscription.interface';
import * as Embeds from '../../utils/embeds';

export class InscriptionService {
	constructor(private api: ApiClient) {}

	/**
	 * Crée une nouvelle partie
	 */
	async create(gameMasterId: string): Promise<ApiResponse<GameData>> {
		return await this.api.post<GameData>('/games/create', {
			gameMasterId
		});
	}

	/**
	 * Récupère la partie en attente d'inscription sur le serveur
	 */
	async getWaitingGame(): Promise<ApiResponse<GameData>> {
		return await this.api.get<GameData>('/games/waiting');
	}

	/**
	 * Récupère une partie par son ID
	 */
	async getGameById(gameId: number): Promise<ApiResponse<GameData>> {
		return await this.api.get<GameData>(`/games/${gameId}`);
	}

	/**
	 * Met à jour les IDs des messages d'interface (Inscription et Compo)
	 */
	async updateMessages(gameId: number, inscriptionMessageId: string, compoMessageId: string): Promise<ApiResponse<any>> {
		return await this.api.patch<any>(`/games/messages/${gameId}`, {
			inscriptionMessageId,
			compoMessageId
		});
	}

	/**
	 * Gère l'inscription ou la désinscription d'un joueur (Toggle)
	 * action: 'join' | 'leave' | 'spectate'
	 */
	async inscription(gameId: number, discordId: string, action: 'join' | 'leave' | 'spectate'): Promise<ApiResponse<GameData>> {
		return await this.api.post<GameData>(`/games/inscription/${gameId}`, {
			discordId,
			action
		});
	}

	/**
	 * Annule et supprime une partie en attente
	 */
	async cancelGame(gameId: number): Promise<ApiResponse<{ message: string }>> {
		return await this.api.delete<{ message: string }>(`/games/cancel/${gameId}`);
	}

	/**
	 * Fermeture automatique des inscriptions
	 */
	async autoCloseInscription(gameId: number, messageId: string, channelId: string, vocId: string): Promise<void> {
		const response = await container.inscriptionService.getGameById(gameId);
		if (!response.success) {
			return;
		}

		const channel = await container.client.channels.fetch(channelId).catch(() => null);
		if (!channel || !channel.isTextBased()) {
			return;
		}

		const message = await (channel as GuildTextBasedChannel).messages.fetch(messageId);
		const updatedPayload = InscriptionMessageBuilder.buildClosed(response.data, vocId);

		await message.edit(updatedPayload);
	}

	/**
	 * Le "Cerveau" qui appelle l'API et rafraîchit les embeds
	 */
	async processInscription(interaction: ButtonInteraction, ctx: InscriptionInteractionContext, action: 'join' | 'leave' | 'spectate') {
		// 1. Appel API
		const response = await container.inscriptionService.inscription(Number(ctx.gameId), interaction.user.id, action);

		if (!response.success) {
			return interaction.followUp({
				embeds: [Embeds.errorEmbed({ title: 'Action refusée', message: response.error })],
				flags: MessageFlags.Ephemeral
			});
		}

		const gameData = response.data;

		// 2. Récupération de la config (pour avoir les IDs des salons)
		const config = await container.serverConfigService.getConfig(interaction.guildId!);
		if (!config.success) return;

		await this.syncMemberRoles(interaction, action, config.data);

		// 3. MISE À JOUR DU MESSAGE PUBLIC (celui où on a cliqué)
		const meta = InscriptionMessageBuilder.extractGameMetaFromMessage(interaction.message);

		let publicPayload;
		switch (ctx.state) {
			case 'opened':
				publicPayload = InscriptionMessageBuilder.buildOpened(
					gameData,
					config.data.inscriptionVoiceChannelId!,
					meta.maxPlayers,
					meta.closeTimestamp
				);
				break;
			case 'closed':
				publicPayload = InscriptionMessageBuilder.buildClosed(gameData, config.data.inscriptionVoiceChannelId!);
				break;
			default:
				publicPayload = InscriptionMessageBuilder.buildStarted(gameData);
		}

		await interaction.editReply(publicPayload);

		// 4. MISE À JOUR DU MESSAGE MJ (Composition)
		if (config.data.gameMjChannelId && gameData.compoMessageId) {
			try {
				const mjChannel = (await interaction.guild?.channels.fetch(config.data.gameMjChannelId)) as GuildTextBasedChannel;
				const compoMsg = await mjChannel.messages.fetch(gameData.compoMessageId);

				const compoPayload = InscriptionMessageBuilder.buildCompo(gameData);
				await compoMsg.edit(compoPayload);
			} catch (err) {
				console.error('Impossible de mettre à jour le message de compo MJ:', err);
			}
		}

		const successMessages: Record<string, string> = {
			join: "Tu rejoins la Chasse aux Sorcières. Prépare-toi à purger le village de la souillure qui l'infeste !",
			leave: 'Ton courage vacille... Tu fuis le chaos comme un faible.',
			spectate: 'Tu te fonds dans les ombres... Le chaos sera ton seul spectacle.'
		};

		return interaction.followUp({
			embeds: [Embeds.successEmbed({ title: 'Action effectué', message: successMessages[action] })],
			flags: MessageFlags.Ephemeral
		});
	}

	private async syncMemberRoles(interaction: ButtonInteraction, action: InscriptionAction, config: ServerConfig) {
		const member = await interaction.guild?.members.fetch(interaction.user.id).catch(() => null);
		if (!member) return;

		const playerRole = config.playerRoleId;
		const spectatorRole = config.spectatorRoleId;

		try {
			if (action === 'join') {
				if (playerRole) await member.roles.add(playerRole);
				if (spectatorRole) await member.roles.remove(spectatorRole);
			} else if (action === 'spectate') {
				if (spectatorRole) await member.roles.add(spectatorRole);
			} else if (action === 'leave') {
				if (playerRole) await member.roles.remove(playerRole);
			}
		} catch (error) {
			console.error(`Erreur lors de la mise à jour des rôles pour ${member.user.tag}:`, error);
		}
	}
}
