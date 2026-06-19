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
		// 1. On accuse réception du clic sur le bouton
		await interaction.deferUpdate();

		const [, , gameIdRaw, step] = interaction.customId.split(':');
		const gameId = Number(gameIdRaw);

		// 2. Mise à jour de la phase via l'API Symfony
		const response = await container.inGameService.updateStep(gameId, step);

		if (!response.success) {
			return interaction.followUp({
				embeds: [Embeds.errorEmbed({ title: 'Erreur', message: "L'API a rencontré un problème lors du passage à la phase suivante." })],
				flags: [MessageFlags.Ephemeral]
			});
		}

		const game = response.data;

		// --- 3. MISE À JOUR DU PANEL MJ ---
		try {
			const mjPayload = GameTrackerMessageBuilder.buildMJTrackerMessage(game);
			await interaction.editReply(mjPayload);
		} catch (mjError) {
			console.error('Erreur lors de la mise à jour du panel MJ :', mjError);
		}

		// --- 4. MISE À JOUR DU TRACKER PUBLIC (Salon de Partie / Débat) ---
		if (interaction.guild) {
			const publicChannelId = game.discordChannels['votesChannelId'];

			if (publicChannelId) {
				try {
					const publicChannel = await interaction.guild.channels.fetch(publicChannelId);

					if (publicChannel?.isTextBased()) {
						const publicContent = GameTrackerMessageBuilder.buildPlayerTrackerMessage(game);

						// 💡 Sécurité : On vérifie si ton builder renvoie un Embed ou une simple String
						const isEmbed = typeof publicContent !== 'string';
						const messagePayload = isEmbed ? { content: '', embeds: [publicContent] } : { content: publicContent };

						// Si on a un ID de message enregistré, on tente de le mettre à jour
						if (game.publicTrackerMessageId) {
							try {
								const publicMsg = await publicChannel.messages.fetch(game.publicTrackerMessageId);
								await publicMsg.edit(messagePayload);
							} catch (fetchError: any) {
								// Si le message est introuvable sur Discord (Unknown Message = 10008)
								if (fetchError.code === 10008) {
									console.warn(`[Game ${gameId}] Message public introuvable. Recréation...`);

									// On recrée le message et on l'épingle
									const newPublicMsg = await publicChannel.send(messagePayload);
									await newPublicMsg.pin();

									// (Optionnel) Ici tu devrais appeler ton API pour sauvegarder le nouvel ID :
									// await container.inGameService.updateTrackers(gameId, { publicTrackerMessageId: newPublicMsg.id });
								} else {
									throw fetchError;
								}
							}
						} else {
							// S'il n'y avait aucun ID dans la BDD, on génère le premier message
							const newPublicMsg = await publicChannel.send(messagePayload);
							await newPublicMsg.pin();
						}
					}
				} catch (publicError) {
					console.error('Erreur lors de la gestion du tracker public :', publicError);
				}
			}
		}

		return;
	}
}
