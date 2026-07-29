import { Guild, TextChannel, VoiceChannel } from 'discord.js';
import { container } from '@sapphire/framework';
import { ApiResponse } from '../../models/ApiResponse.interface';
import { GameData, GamePlayerInterface, NightDeathPlayer } from '../../models/game/Game.interface';
import { ApiClient } from '../apiClient.service';
import { GameTrackerMessageBuilder } from '../../builders/game/GameTrackerBuilder';
import { setTimeout as sleep } from 'timers/promises';
import * as Embeds from '../../utils/embeds';

export class InGameService {
	constructor(private api: ApiClient) {}

	async getActiveGame(): Promise<ApiResponse<GameData>> {
		return await this.api.get<GameData>(`/game/active`);
	}

	async getGameById(gameId: string): Promise<ApiResponse<GameData>> {
		return await this.api.get<GameData>(`/game/${gameId}`);
	}

	async updateStep(gameId: number, step: string): Promise<ApiResponse<GameData>> {
		return await this.api.patch<GameData>(`/game/${gameId}/step`, { step });
	}

	async killPlayer(
		gameId: number,
		data: { discordId: string; deathCause: string; hideRole: boolean; fakeRoleId: number | null }
	): Promise<ApiResponse<GameData>> {
		return await this.api.post<GameData>(`/game/${gameId}/kill`, { ...data });
	}

	async revealPlayer(gameId: number, discordId: string): Promise<ApiResponse<GameData>> {
		return await this.api.post<GameData>(`/game/${gameId}/reveal`, { discordId });
	}

	async getNightDeaths(gameId: number): Promise<ApiResponse<NightDeathPlayer[]>> {
		return await this.api.get<NightDeathPlayer[]>(`/game/${gameId}/night-deaths`);
	}

	async getFirstNightDeaths(gameId: number): Promise<ApiResponse<NightDeathPlayer[]>> {
		return await this.api.get<NightDeathPlayer[]>(`/game/${gameId}/first-night-deaths`);
	}

	async finishGame(gameId: number, winningCamp: string): Promise<ApiResponse<GameData>> {
		return await this.api.post<GameData>(`/game/${gameId}/finish`, { winningCamp });
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

	public async updateTrackers(guild: Guild, game: any): Promise<void> {
		// --- 0. RÉCUPÉRATION DE LA CONFIG SERVEUR ---
		const configResponse = await container.serverConfigService.getConfig(guild.id);
		const mjChannelId = configResponse.success ? configResponse.data.gameMjChannelId : null;

		// --- 1. MISE À JOUR DU PANEL MJ ---
		const mjPayload = GameTrackerMessageBuilder.buildMJTrackerMessage(game);

		if (mjChannelId && game.mjTrackerMessageId) {
			try {
				const mjChannel = await guild.channels.fetch(mjChannelId);

				if (mjChannel?.isTextBased()) {
					const mjMessage = await mjChannel.messages.fetch(game.mjTrackerMessageId);
					await mjMessage.edit(mjPayload);
				}
			} catch (mjError) {
				console.error(`[Game ${game.id}] Erreur fetch message MJ :`, mjError);
			}
		}

		// --- 2. MISE À JOUR DU TRACKER PUBLIC (Salon de Partie / Débat) ---
		if (game.discordChannels && game.discordChannels['votesChannelId']) {
			const publicChannelId = game.discordChannels['votesChannelId'];

			try {
				const publicChannel = await guild.channels.fetch(publicChannelId);

				if (publicChannel?.isTextBased()) {
					const publicContent = GameTrackerMessageBuilder.buildPlayerTrackerMessage(game);
					const isEmbed = typeof publicContent !== 'string';
					const messagePayload = isEmbed ? { content: '', embeds: [publicContent] } : { content: publicContent };

					if (game.publicTrackerMessageId) {
						try {
							const publicMsg = await publicChannel.messages.fetch(game.publicTrackerMessageId);
							await publicMsg.edit(messagePayload);
						} catch (fetchError: any) {
							// Si le message a été supprimé manuellement, on le recrée
							if (fetchError.code === 10008) {
								console.warn(`[Game ${game.id}] Message public introuvable. Recréation...`);
								const newPublicMsg = await publicChannel.send(messagePayload);
								await newPublicMsg.pin();

								await container.gameLauncherService.updateGameTrackers(game.id, newPublicMsg.id, game.mjTrackerMessageId);
							} else {
								throw fetchError;
							}
						}
					} else {
						const newPublicMsg = await publicChannel.send(messagePayload);
						await newPublicMsg.pin();

						await container.gameLauncherService.updateGameTrackers(game.id, newPublicMsg.id, game.mjTrackerMessageId);
					}
				}
			} catch (publicError) {
				console.error(`[Game ${game.id}] Erreur lors de la gestion du tracker public :`, publicError);
			}
		}
	}

	/**
	 * Gère la chronologie du débat.
	 */
	public async runDebateTimeline(guild: any, voteChannel: TextChannel, players: GamePlayerInterface[], durationMinutes: number) {
		const endTimeUnix = Math.floor(Date.now() / 1000) + durationMinutes * 60;

		// 1. Démute de tout le monde
		for (const player of players) {
			if (!player.isAlive || player.isSpectator) continue;

			if (player.user?.discordId) {
				try {
					// Force la récupération fraîche du membre depuis l'API Discord
					const member = await guild.members.fetch(player.user.discordId);

					// On vérifie qu'il est bien dans un salon vocal
					if (member && member.voice.channelId) {
						await member.voice.setMute(false, 'Début du temps de débat');
					}
				} catch (error) {
					console.error(`[Mute Error] Impossible de demute le joueur ${player.user.discordId}:`, error);
				}
			}
		}

		// 2. Message de début (On sauvegarde le message dans une variable "startMsg")
		let startMsg: any = null;
		if (voteChannel) {
			startMsg = await voteChannel
				.send({
					embeds: [
						Embeds.successEmbed({
							title: 'Le débat est ouvert !',
							message: `Vous pouvez parler. Fin du temps imparti <t:${endTimeUnix}:R>.`
						})
					]
				})
				.catch(() => null);
		}

		// 3. Chrono et alerte éphémère la dernière minute
		const durationMs = durationMinutes * 60 * 1000;
		const oneMinuteMs = 60 * 1000;

		if (durationMinutes > 1) {
			const warningDelay = durationMs - oneMinuteMs;

			// On attend jusqu'à la dernière minute
			await sleep(warningDelay);

			// Envoi de l'avertissement
			if (voteChannel) {
				const warningMsg = await voteChannel
					.send({
						content: "**Il ne reste plus qu'une minute de débat !**"
					})
					.catch(() => null);

				// Auto-suppression après 10s
				if (warningMsg) {
					setTimeout(() => warningMsg.delete().catch(() => null), 10_000);
				}
			}

			// On attend la dernière minute restante
			await sleep(oneMinuteMs);
		} else {
			// Si le débat ne dure qu'une minute de base, on attend direct la fin
			await sleep(durationMs);
		}

		// 4. Fin du débat et remute sécurisé
		for (const player of players) {
			if (!player.isAlive || player.isSpectator) continue;

			if (player.user?.discordId) {
				try {
					// Force la récupération fraîche du membre depuis l'API Discord
					const member = await guild.members.fetch(player.user.discordId);

					// On vérifie qu'il est bien dans un salon vocal
					if (member && member.voice.channelId) {
						await member.voice.setMute(true, 'Fin du temps de débat');
					}
				} catch (error) {
					console.error(`[Mute Error] Impossible de mute le joueur ${player.user.discordId}:`, error);
				}
			}
		}

		// 5. Modification de l'embed de départ ET petit message de fin
		if (voteChannel) {
			// On modifie l'embed de départ pour le transformer en message d'erreur rouge
			if (startMsg) {
				await startMsg
					.edit({
						embeds: [
							Embeds.errorEmbed({
								title: 'Fin du débat !',
								message: "Il est l'heure de voter pour ceux ne l'ayant pas encore fait."
							})
						]
					})
					.catch(() => null);
			}

			// On envoie le petit ping rapide
			const endPingMsg = await voteChannel
				.send({
					content: '**Le débat est terminé !** Place aux votes.'
				})
				.catch(() => null);

			// Auto-suppression du petit message après 10 secondes
			if (endPingMsg) {
				setTimeout(() => endPingMsg.delete().catch(() => null), 10_000);
			}
		}
	}
}
