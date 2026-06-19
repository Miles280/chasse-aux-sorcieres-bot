import { ApplyOptions } from '@sapphire/decorators';
import { InteractionHandler, InteractionHandlerTypes, container } from '@sapphire/framework';
import { ButtonInteraction, MessageFlags } from 'discord.js';
import { GameTrackerMessageBuilder } from '../../../builders/game/GameTrackerBuilder';
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
				embeds: [Embeds.errorEmbed({ title: 'Erreur', message: "L'API a rencontré un problème lors du passage à la phase suivante." })],
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

		// 3. MISE À JOUR DU PANEL MJ
		try {
			const mjPayload = GameTrackerMessageBuilder.buildMJTrackerMessage(game);
			await interaction.editReply(mjPayload);
		} catch (mjError) {
			console.error('Erreur lors de la mise à jour du panel MJ :', mjError);
		}

		// 4. MISE À JOUR DU TRACKER PUBLIC (Salon de Partie / Débat)
		if (interaction.guild) {
			const publicChannelId = game.discordChannels['votesChannelId'];

			if (publicChannelId) {
				try {
					const publicChannel = await interaction.guild.channels.fetch(publicChannelId);

					if (publicChannel?.isTextBased()) {
						const publicContent = GameTrackerMessageBuilder.buildPlayerTrackerMessage(game);
						const isEmbed = typeof publicContent !== 'string';
						const messagePayload = isEmbed ? { content: '', embeds: [publicContent] } : { content: publicContent };

						if (game.publicTrackerMessageId) {
							try {
								const publicMsg = await publicChannel.messages.fetch(game.publicTrackerMessageId);
								await publicMsg.edit(messagePayload);
							} catch (fetchError: any) {
								if (fetchError.code === 10008) {
									console.warn(`[Game ${gameId}] Message public introuvable. Recréation...`);
									const newPublicMsg = await publicChannel.send(messagePayload);
									await newPublicMsg.pin();
								} else {
									throw fetchError;
								}
							}
						} else {
							const newPublicMsg = await publicChannel.send(messagePayload);
							await newPublicMsg.pin();
						}
					}
				} catch (publicError) {
					console.error('Erreur lors de la gestion du tracker public :', publicError);
				}
			}
		}

		// 5. MESSAGES D'AMBIANCE RP (Channel Sorcières)
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

		return;
	}
}
