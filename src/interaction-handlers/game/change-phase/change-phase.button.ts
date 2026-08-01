import { ApplyOptions } from '@sapphire/decorators';
import { InteractionHandler, InteractionHandlerTypes, container } from '@sapphire/framework';
import { ButtonInteraction, MessageFlags, ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder, TextChannel } from 'discord.js';
import { emojis } from '../../../utils/emojis';
import { NightDeathPlayer } from '../../../models/game/Game.interface';
import * as Embeds from '../../../utils/embeds';

@ApplyOptions<InteractionHandler.Options>({
	interactionHandlerType: InteractionHandlerTypes.Button
})
export class ChangePhaseHandler extends InteractionHandler {
	public override parse(interaction: ButtonInteraction) {
		return interaction.customId.startsWith('change-phase:button:') ? this.some() : this.none();
	}

	public override async run(interaction: ButtonInteraction) {
		const [, , gameIdRaw, step] = interaction.customId.split(':');
		const gameId = Number(gameIdRaw);

		let activeInteraction: any = interaction; // Permet de gérer la réponse sur la modale ou le bouton
		let debateMinutes = 0;

		// 0. Interception de la phase "jour" pour la modale
		if (step === 'day') {
			const modal = new ModalBuilder().setCustomId(`debate:modal:${interaction.id}`).setTitle('Lancement du Jour');

			const timeInput = new TextInputBuilder()
				.setCustomId('debateTime')
				.setLabel('Temps de débat (en minutes)')
				.setStyle(TextInputStyle.Short)
				.setValue('5') // Valeur par défaut
				.setRequired(true);

			modal.addComponents(new ActionRowBuilder<TextInputBuilder>().addComponents(timeInput));

			// On affiche la modale AU LIEU de defer
			await interaction.showModal(modal);

			try {
				// On attend la réponse du MJ (délai d'une minute max)
				const modalSubmit = await interaction.awaitModalSubmit({
					filter: (i) => i.customId === `debate:modal:${interaction.id}` && i.user.id === interaction.user.id,
					time: 60_000
				});

				debateMinutes = parseInt(modalSubmit.fields.getTextInputValue('debateTime'), 10) || 5;

				// On met à jour l'interaction active pour répondre dessus ensuite
				activeInteraction = modalSubmit;
				await activeInteraction.deferUpdate();
			} catch (error) {
				// Si le MJ ferme la modale sans valider ou prend plus d'une minute, on annule.
				return;
			}
		} else {
			await activeInteraction.deferUpdate();
		}

		// 1. Mise à jour de la phase via l'API Symfony
		const response = await container.inGameService.updateStep(gameId, step);

		if (!response.success) {
			return activeInteraction.followUp({
				embeds: [Embeds.errorEmbed({ title: 'Erreur', message: "L'API a rencontré un problème." })],
				flags: [MessageFlags.Ephemeral]
			});
		}

		const game = response.data;

		const responseConfig = await container.serverConfigService.getConfig(activeInteraction.guildId!);
		if (!responseConfig.success) {
			return activeInteraction.followUp({
				embeds: [Embeds.errorEmbed({ title: 'Erreur', message: 'Erreur lors de la récupération des configs.' })],
				flags: [MessageFlags.Ephemeral]
			});
		}

		const playerRoleId = responseConfig.data.playerRoleId;

		// 2. GESTION DES PERMISSIONS DES SALONS SELON LA PHASE
		if (activeInteraction.guild && playerRoleId) {
			await container.inGameService.updatePhasePermissions(activeInteraction.guild, game.discordChannels, step, playerRoleId);
		}

		// 3. MISE À JOUR DES TRACKERS
		if (activeInteraction.guild) {
			await container.inGameService.updateTrackers(activeInteraction.guild, game);
		}

		// 4. MESSAGES D'AMBIANCE RP (Channel Sorcières)
		if (activeInteraction.guild && game.discordChannels['witchesChannelId'] && (step === 'night' || step === 'dawn')) {
			try {
				const witchesChannelId = game.discordChannels['witchesChannelId'];
				const witchesChannel = await activeInteraction.guild.channels.fetch(witchesChannelId);

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
		let voteChannelTarget: TextChannel | null = null;

		if (activeInteraction.guild && step === 'day' && game.discordChannels['votesChannelId']) {
			try {
				const voteChannelId = game.discordChannels['votesChannelId'];
				const voteChannel = (await activeInteraction.guild.channels.fetch(voteChannelId)) as TextChannel;

				if (voteChannel) {
					voteChannelTarget = voteChannel;
					const currentDay = game.dayNumber;

					const deathsResponse = await container.inGameService.getNightDeaths(gameId);

					if (deathsResponse.success) {
						const nightVictims = deathsResponse.data as NightDeathPlayer[];
						let announceMessage = `## ☀️ __Jour ${currentDay}__ : Le soleil se lève sur le village\n`;

						if (nightVictims.length > 0) {
							announceMessage += `La nuit a été agitée et ${nightVictims.length > 1 ? 'des cadavres ont été retrouvés :' : 'un cadavre a été retrouvé :'}\n\n`;

							for (const victim of nightVictims) {
								let roleText = '';
								if (!victim.revealedRole && victim.trueRole) {
									roleText = 'Son rôle reste **secret**...';
								} else if (victim.revealedRole) {
									roleText = `Son rôle était **${victim.revealedRole.name}**.`;
								} else {
									roleText = 'Son rôle est inconnu.';
								}

								announceMessage += `> ${emojis.dead} __<@${victim.user.discordId}> a rendu l'âme__ : ${roleText}\n`;

								const config = responseConfig.data;

								try {
									const member = await activeInteraction.guild.members.fetch(victim.user.discordId);
									if (member) {
										if (config.playerRoleId && config.deadPlayerRoleId) {
											await member.roles.remove(config.playerRoleId).catch(console.error);
											await member.roles.add(config.deadPlayerRoleId).catch(console.error);
										}

										try {
											await member.voice.setMute(false, 'Joueur mort sur la partie');
										} catch (error) {
											console.error(`[Mute Error] Échec pour ${member.id}:`, (error as Error).message);
										}

										await container.discordService.moveMemberToVc(
											activeInteraction.guild!,
											member.id,
											game.discordChannels['deadVoiceId']
										);
									}
								} catch (memberError) {
									console.error(`Impossible de maj le joueur Discord ${victim.user.discordId} :`, memberError);
								}
							}
						} else {
							announceMessage += `\nLa nuit a été particulièrement calme. **Personne n'est mort cette nuit !**`;
						}

						await voteChannel.send({ content: announceMessage });
					}
				}
			} catch (error) {
				console.error("Erreur lors de l'annonce du lever de jour :", error);
			}
		}

		// 6. Lancement automatique du débat (S'il y en a un de paramétré via la modale)
		if (step === 'day' && debateMinutes > 0 && voteChannelTarget && activeInteraction.guild) {
			return container.inGameService.runDebateTimeline(activeInteraction.guild, voteChannelTarget, game.gamePlayers, debateMinutes);
		}
	}
}
