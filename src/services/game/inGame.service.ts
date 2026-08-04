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
	public async runDebateTimeline(
		guild: any,
		voteChannel: TextChannel,
		players: GamePlayerInterface[],
		durationMinutes: number,
		isSousDebat: boolean,
		gameId?: number,
		game?: any,
		playerRoleId?: string
	) {
		const guildId = guild.id;
		const endTimeUnix = Math.floor(Date.now() / 1000) + durationMinutes * 60;

		let cancelReason: string | null = null;

		// On enregistre l'annulation pour ce serveur
		DebateManager.register(guildId, (reason: string) => {
			cancelReason = reason;
		});

		// Fonction utilitaire de sleep interruptible
		const interruptibleSleep = async (ms: number) => {
			const start = Date.now();
			while (Date.now() - start < ms) {
				// 1. Un nouveau débat a été lancé (ou arrêt brutal) : On coupe tout !
				if (cancelReason === 'OVERRIDE' || cancelReason === 'STOP') {
					throw new Error('DEBATE_CANCELLED');
				}
				// 2. Le MJ a cliqué sur le bouton "Passer au Crépuscule" : On saute le timer !
				if (cancelReason === 'FORCE_DUSK') {
					return;
				}

				await sleep(2000); // 2 secondes (plus réactif si le MJ clique)
			}
		};

		try {
			// 1. Démute de tout le monde
			for (const player of players) {
				if (!player.isAlive || player.isSpectator) continue;
				if (!player.user?.discordId) continue;

				try {
					const member = await guild.members.fetch(player.user.discordId);
					await member.voice.setMute(false, 'Début du temps de débat');
				} catch (error) {
					console.error(`[Mute Error] Échec pour ${player.user.discordId}:`, (error as Error).message);
				}
			}

			// 2. Message de début
			let startMsg: any = null;
			const firstTilte = isSousDebat ? 'Le sous-débat est ouvert !' : 'Le débat est ouvert !';
			if (voteChannel) {
				startMsg = await voteChannel
					.send({
						embeds: [
							Embeds.successEmbed({
								title: firstTilte,
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
				await interruptibleSleep(warningDelay);

				// Si on a forcé le crépuscule pendant la première partie, on ne veut pas
				// envoyer le message "Il reste 1 minute", on veut passer direct à la suite.
				if (!cancelReason) {
					if (voteChannel) {
						const warningMsg = await voteChannel.send({ content: "**Il ne reste plus qu'une minute de débat !**" }).catch(() => null);
						if (warningMsg) setTimeout(() => warningMsg.delete().catch(() => null), 10_000);
					}
					await interruptibleSleep(oneMinuteMs);
				}
			} else {
				await interruptibleSleep(durationMs);
			}

			if (cancelReason === 'OVERRIDE' || cancelReason === 'STOP') return;

			// 4. Fin du débat normale et remute sécurisé
			for (const player of players) {
				if (!player.user?.discordId) continue;

				try {
					// Fetch force la récupération des données fraîches, y compris les nouveaux rôles
					const member = await guild.members.fetch(player.user.discordId);

					const configResponse = await container.serverConfigService.getConfig(guild.id);
					if (!configResponse.success) {
						return console.warn('Erreur dans la récupération de la config');
					}
					const config = configResponse.data;

					const isDeadOnDiscord = member.roles.cache.has(config.deadPlayerRoleId);
					const isSpectator = member.roles.cache.has(config.spectatorRoleId);

					// S'il est mort ou spectateur, on l'ignore totalement : on ne le mute pas.
					if (isDeadOnDiscord || isSpectator) {
						console.log(`[Débat Skip] ${member.user.tag} est mort/spectateur. On ne le server-mute pas.`);
						continue;
					}

					// S'il a survécu ET qu'il est actuellement dans un salon vocal (n'importe lequel)
					if (member.voice.channelId) {
						await member.voice.setMute(true, 'Fin du temps de débat');
					}
				} catch (error) {
					console.error(`[Mute Error] Échec pour ${player.user.discordId}:`, (error as Error).message);
				}
			}

			// 5. Modification de l'embed de fin
			const secondTilte = isSousDebat ? 'Fin du sous-débat !' : 'Fin du débat !';
			if (voteChannel) {
				if (startMsg) {
					await startMsg
						.edit({
							embeds: [
								Embeds.errorEmbed({
									title: secondTilte,
									message: "Il est l'heure de voter pour ceux ne l'ayant pas encore fait."
								})
							]
						})
						.catch(() => null);
				}

				const endPingMsg = await voteChannel.send({ content: '**Le débat est terminé !** Place aux votes.' }).catch(() => null);
				if (endPingMsg) setTimeout(() => endPingMsg.delete().catch(() => null), 10_000);
			}

			// 6. Passage automatique au crépuscule
			if (!isSousDebat && !cancelReason && gameId && game && playerRoleId) {
				console.log('Passage automatique au Crépuscule...');
				try {
					// 1. Maj de l'API ET récupération de la nouvelle version du jeu (qui est en 'dusk')
					const response = await container.inGameService.updateStep(gameId, 'dusk');

					if (response.success) {
						const updatedGame = response.data; // <-- Le jeu à jour !

						// 2. Maj des permissions (fermeture du chat textuel)
						await container.inGameService.updatePhasePermissions(guild, updatedGame.discordChannels, 'dusk', playerRoleId);

						// 3. Maj des trackers en lui passant le JEU À JOUR
						await container.inGameService.updateTrackers(guild, updatedGame);
					} else {
						console.error("L'API a refusé le passage au crépuscule.");
					}
				} catch (error) {
					console.error('Erreur lors du passage auto au Crépuscule :', error);
				}
			}
		} catch (error: any) {
			if (error.message === 'DEBATE_CANCELLED') {
				console.log(`[Débat] Le débat sur le serveur ${guild.name} a été stoppé.`);
			} else {
				console.error('[Débat Error]', error);
			}
		} finally {
			// Nettoyage de la map
			DebateManager.clear(guildId);
		}
	}
}

// Une Map pour stocker les fonctions d'annulation par ID de guilde, en passant la RAISON
const activeDebates = new Map<string, (reason: string) => void>();

export const DebateManager = {
	// Enregistre un débat en cours
	register(guildId: string, cancelFunction: (reason: string) => void) {
		// S'il y avait déjà un débat, on l'annule avec la raison "OVERRIDE" (écrasement)
		if (activeDebates.has(guildId)) {
			activeDebates.get(guildId)!('OVERRIDE');
		}
		activeDebates.set(guildId, cancelFunction);
	},

	// Arrête le débat en cours (appelé par le bouton du MJ ou une commande /finish)
	// On permet de passer une raison personnalisée, par défaut 'STOP'
	stop(guildId: string, reason: string = 'STOP') {
		if (activeDebates.has(guildId)) {
			activeDebates.get(guildId)!(reason);
			activeDebates.delete(guildId);
		}
	},

	clear(guildId: string) {
		activeDebates.delete(guildId);
	}
};
