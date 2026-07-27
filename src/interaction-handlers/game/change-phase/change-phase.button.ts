import { ApplyOptions } from '@sapphire/decorators';
import { InteractionHandler, InteractionHandlerTypes, container } from '@sapphire/framework';
import { ButtonInteraction, MessageFlags } from 'discord.js';
import * as Embeds from '../../../utils/embeds';
import { emojis } from '../../../utils/emojis';
import { NightDeathPlayer } from '../../../models/game/Game.interface';

@ApplyOptions<InteractionHandler.Options>({
	interactionHandlerType: InteractionHandlerTypes.Button
})
export class ChangePhaseHandler extends InteractionHandler {
	public override parse(interaction: ButtonInteraction) {
		return interaction.customId.startsWith('change-phase:button:') ? this.some() : this.none();
	}

	public override async run(interaction: ButtonInteraction) {
		await interaction.deferUpdate();

		const [, , gameIdRaw, step] = interaction.customId.split(':');
		const gameId = Number(gameIdRaw);

		// 1. Mise à jour de la phase via l'API Symfony
		const response = await container.inGameService.updateStep(gameId, step);

		if (!response.success) {
			return interaction.followUp({
				embeds: [Embeds.errorEmbed({ title: 'Erreur', message: "L'API a rencontré un problème." })],
				flags: [MessageFlags.Ephemeral]
			});
		}

		const game = response.data;

		const responseConfig = await container.serverConfigService.getConfig(interaction.guildId!);
		if (!responseConfig.success) {
			return interaction.followUp({
				embeds: [Embeds.errorEmbed({ title: 'Erreur', message: 'Erreur lors de la récupération des configs.' })],
				flags: [MessageFlags.Ephemeral]
			});
		}

		const playerRoleId = responseConfig.data.playerRoleId;

		// 2. GESTION DES PERMISSIONS DES SALONS SELON LA PHASE
		if (interaction.guild && playerRoleId) {
			await container.inGameService.updatePhasePermissions(interaction.guild, game.discordChannels, step, playerRoleId);
		}

		// 3. MISE À JOUR DES TRACKERS
		if (interaction.guild) {
			await container.inGameService.updateTrackers(interaction.guild, game);
		}

		// 4. MESSAGES D'AMBIANCE RP (Channel Sorcières)
		if (interaction.guild && game.discordChannels['witchesChannelId'] && (step === 'night' || step === 'dawn')) {
			try {
				const witchesChannelId = game.discordChannels['witchesChannelId'];
				const witchesChannel = await interaction.guild.channels.fetch(witchesChannelId);

				if (witchesChannel?.isTextBased()) {
					const aliveWitches = game.gamePlayers.filter((p: any) => p.isAlive === true && p.trueRole?.camp === 'witch');

					if (aliveWitches.length > 0) {
						const pings = aliveWitches.map((p: any) => `<@${p.user.discordId}>`).join(', ');

						const rpMessage =
							step === 'night'
								? `La nuit tombe, vous vous retrouvez toutes dans votre antre...\n${pings}`
								: `L'aube se lève, vous vous séparez... Jusqu'à ce soir.\n${pings}`;

						await witchesChannel.send(rpMessage);
					}
				}
			} catch (error) {
				console.error("Erreur lors de l'envoi du message d'ambiance aux sorcières :", error);
			}
		}

		// 5. ANNONCE DU MATIN & OUVERTURE DES VOTES
		if (interaction.guild && step === 'day' && game.discordChannels['votesChannelId']) {
			try {
				const voteChannelId = game.discordChannels['votesChannelId'];
				const voteChannel = await interaction.guild.channels.fetch(voteChannelId);

				if (voteChannel?.isTextBased()) {
					const currentDay = game.dayNumber;

					// Appel du nouvel endpoint pour récupérer les morts de la nuit
					const deathsResponse = await container.inGameService.getNightDeaths(gameId);

					if (deathsResponse.success) {
						const nightVictims = deathsResponse.data as NightDeathPlayer[];

						let announceMessage = `## ☀️ __Jour ${currentDay}__ : Le soleil se lève sur le village\n`;

						if (nightVictims.length > 0) {
							announceMessage += `La nuit a été agitée et ${nightVictims.length > 1 ? 'des cadavres ont été retrouvés :' : 'un cadavre a été retrouvé :'}\n\n`;

							for (const victim of nightVictims) {
								// --- 1. CONSTRUCTION DU MESSAGE D'ANNONCE ---
								let roleText = '';
								if (!victim.revealedRole && victim.trueRole) {
									roleText = 'Son rôle reste **secret**...';
								} else if (victim.revealedRole) {
									roleText = `Son rôle était **${victim.revealedRole.name}**.`;
								} else {
									roleText = 'Son rôle est inconnu.';
								}

								announceMessage += `> ${emojis.dead} __<@${victim.user.discordId}> a rendu l'âme__ : ${roleText}\n`;

								// Récupération de la config serveur
								const configResponse = await container.serverConfigService.getConfig(interaction.guildId!);
								if (!configResponse.success) {
									return interaction.editReply({
										embeds: [Embeds.errorEmbed({ title: 'Erreur Config', message: configResponse.error })]
									});
								}
								const config = configResponse.data;

								// --- 2. GESTION DES RÔLES & VOCAL DISCORD ---
								try {
									const member = await interaction.guild.members.fetch(victim.user.discordId);

									if (member) {
										// A. Swap des rôles (Vivant -> Mort)
										if (config.playerRoleId && config.deadPlayerRoleId) {
											await member.roles.remove(config.playerRoleId).catch(console.error);
											await member.roles.add(config.deadPlayerRoleId).catch(console.error);
										}

										// B. Move dans le channel vocal de l'Au-delà (Si en vocal)
										if (member.voice.channelId && game.discordChannels['deadVoiceId']) {
											await member.voice.setChannel(game.discordChannels['deadVoiceId']).catch(console.error);
										}
									}
								} catch (memberError) {
									console.error(`Impossible de mettre à jour le joueur Discord ${victim.user.discordId} :`, memberError);
								}
							}
						} else {
							announceMessage += `\nLa nuit a été particulièrement calme. **Personne n'est mort cette nuit !**`;
						}

						// Envoi de l'annonce textuelle
						await voteChannel.send({ content: announceMessage });
					}
				}
			} catch (error) {
				console.error("Erreur lors de l'annonce du lever de jour :", error);
			}
		}

		return;
	}
}
