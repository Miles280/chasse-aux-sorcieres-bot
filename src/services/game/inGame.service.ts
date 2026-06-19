import { TextChannel, VoiceChannel } from 'discord.js';
import { ApiResponse } from '../../models/ApiResponse.interface';
import { GameData } from '../../models/game/Game.interface';
import { ApiClient } from '../apiClient.service';

export class InGameService {
	constructor(private api: ApiClient) {}

	async updateStep(gameId: number, step: string): Promise<ApiResponse<GameData>> {
		return await this.api.patch<GameData>(`/game/${gameId}/step`, { step });
	}

	/**
	 * Gère l'ouverture et la fermeture des salons selon la phase
	 */
	public async updatePhasePermissions(guild: any, channels: any, step: string, roleId: string) {
		// Fonction utilitaire locale pour modifier rapidement un salon
		const setSpeakPermission = async (channelId: string | undefined, canSpeak: boolean) => {
			if (!channelId) return;
			try {
				const channel = await guild.channels.fetch(channelId);
				// On s'assure qu'on peut bien éditer les permissions de ce salon
				if (channel && 'permissionOverwrites' in channel) {
					await (channel as TextChannel | VoiceChannel).permissionOverwrites.edit(roleId, {
						SendMessages: canSpeak
					});
				}
			} catch (error) {
				console.error(`Impossible de modifier les perms du salon ${channelId}:`, error);
			}
		};

		// Application de tes règles métiers
		switch (step) {
			case 'night':
				await setSpeakPermission(channels.debatChannelId, false);
				await setSpeakPermission(channels.votesChannelId, false);
				await setSpeakPermission(channels.witchesChannelId, true);
				break;
			case 'dawn':
				await setSpeakPermission(channels.witchesChannelId, false);
				break;
			case 'day':
				await setSpeakPermission(channels.debatChannelId, true);
				await setSpeakPermission(channels.votesChannelId, true);
				break;
			case 'dusk':
				await setSpeakPermission(channels.debatChannelId, false);
				// Le salon de vote reste ouvert implicitement
				break;
		}
	}
}
