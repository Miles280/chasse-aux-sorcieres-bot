import { ApplyOptions } from '@sapphire/decorators';
import { InteractionHandler, InteractionHandlerTypes, container } from '@sapphire/framework';
import { ButtonInteraction, MessageFlags } from 'discord.js';
import * as Embeds from '../../../utils/embeds';

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
						const nightVictims = deathsResponse.data; // Tableau de GamePlayerInterface

						let announceMessage = `**Le soleil se lève sur le village (Jour ${currentDay})...**\n`;

						if (nightVictims.length > 0) {
							announceMessage += `La nuit a été agitée et les esprits rôdent. Nous déplorons des pertes :\n\n`;

							for (const victim of nightVictims) {
								// LOGIQUE DU RÔLE CACHÉ
								let roleText = '';
								if (!victim.revealedRole && victim.trueRole) {
									roleText = 'Son rôle reste **secret**... 🎭';
								} else if (victim.revealedRole) {
									roleText = `Il était **${victim.revealedRole.name}** 🔍`;
								} else {
									roleText = 'Son rôle est inconnu.';
								}

								announceMessage += `• 💀 <@${victim.user.discordId}> a été éliminé. (${roleText})\n`;
							}
							announceMessage += `\n💬 Place aux débats ! Vous devez maintenant désigner un coupable.`;
						} else {
							announceMessage += `\n🍀 Miracle ! La nuit a été particulièrement calme. **Personne n'est mort cette nuit !**\n\n💬 Profitez-en pour débusquer les ennemis. Le vote est ouvert !`;
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
