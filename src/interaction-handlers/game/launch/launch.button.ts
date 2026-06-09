import { ApplyOptions } from '@sapphire/decorators';
import { InteractionHandler, InteractionHandlerTypes, container } from '@sapphire/framework';
import { ButtonInteraction } from 'discord.js';
import { GameMessageBuilder } from '../../../builders/game/GameMessage.builder';
import * as Embeds from '../../../utils/embeds';

@ApplyOptions<InteractionHandler.Options>({
	interactionHandlerType: InteractionHandlerTypes.Button
})
export class LaunchHandler extends InteractionHandler {
	public override parse(interaction: ButtonInteraction) {
		return interaction.customId.startsWith('launch:button:') ? this.some() : this.none();
	}

	public override async run(interaction: ButtonInteraction) {
		// 🔥 FIX : On prévient Discord qu'on prend en charge le clic, ça donne jusqu'à 15 minutes au bot pour répondre !
		await interaction.deferUpdate();

		// 1. Extraction des données du customId
		const [, , action, gameIdRaw, gameMode] = interaction.customId.split(':');
		const gameId = Number(gameIdRaw);

		const waitingGameRes = await container.inscriptionService.getWaitingGame();
		if (!waitingGameRes.success || !waitingGameRes.data) {
			return interaction.editReply({
				embeds: [Embeds.errorEmbed({ title: 'Erreur', message: "Aucune partie n'est prête à être lancée." })]
			});
		}

		const game = waitingGameRes.data;

		try {
			if (action === 'reroll') {
				// --- PHASE 1 : PREVIEW (REROLL / VALIDER) ---
				const previewRes = await container.gameLauncherService.getPreview(gameId);

				if (!previewRes.success) {
					return interaction.editReply({
						embeds: [Embeds.errorEmbed({ title: 'Erreur', message: previewRes.error || 'Erreur API' })],
						components: [] // Optionnel : retire les boutons si erreur
					});
				}

				const distribution = previewRes.data.distribution;
				const message = GameMessageBuilder.buildPreview(gameId, gameMode, distribution);

				container.gameLauncherService.setPreviewCache(gameId, distribution);

				return interaction.editReply(message);
			} else {
				// --- PHASE 2 : FAST START (On délègue tout au service) ---
				const distribution = container.gameLauncherService.getPreviewCache(gameId);

				// Ce processLaunch peut être long (API + création de N salons), le deferUpdate le protège !
				await container.gameLauncherService.processLaunch(interaction.guild!, game, distribution);

				return interaction.editReply({
					embeds: [
						Embeds.successEmbed({
							title: 'Lancement réalisé !',
							message: 'La partie a été lancée avec succès et les salons sont créés !'
						})
					],
					components: [] // Nettoie les boutons pour qu'on ne puisse plus cliquer dessus
				});
			}
		} catch (error: any) {
			console.error(error);
			// On utilise errorEmbed ici plutôt que successEmbed pour une erreur
			return interaction.editReply({
				embeds: [
					Embeds.errorEmbed({
						message: error.message
					})
				],
				components: []
			});
		}
	}
}
