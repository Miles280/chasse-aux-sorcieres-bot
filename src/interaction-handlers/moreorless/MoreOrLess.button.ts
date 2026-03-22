import { ApplyOptions } from '@sapphire/decorators';
import { InteractionHandler, InteractionHandlerTypes, container } from '@sapphire/framework';
import { ButtonInteraction, ContainerBuilder, MessageFlags, TextDisplayBuilder } from 'discord.js';
import { MoreOrLessMessageBuilder } from '../../builders/MoreOrLessMessage.builder';
import * as Embeds from '../../utils/embeds';
import { colors } from '../../utils/customColors';
import { emojis } from '../../utils/emojis';

@ApplyOptions<InteractionHandler.Options>({
	interactionHandlerType: InteractionHandlerTypes.Button
})
export class MoreOrLessButtonHandler extends InteractionHandler {
	public override parse(interaction: ButtonInteraction) {
		if (!interaction.customId.startsWith('mol:')) return this.none();
		return this.some();
	}

	public async run(interaction: ButtonInteraction) {
		const [, action, messageId] = interaction.customId.split(':');
		const userId = interaction.user.id;

		// =========================================================
		// 1. LOGIQUE DE DÉFI (Accepter / Refuser)
		// =========================================================
		if (action === 'accept' || action === 'decline') {
			if (action === 'accept') {
				const result = await container.moreOrLessService.acceptChallenge(messageId, userId);

				if (!result.success) {
					return interaction.reply({
						embeds: [Embeds.errorEmbed({ message: result.error! })],
						flags: MessageFlags.Ephemeral
					});
				}

				const gameData = result.game!;

				// On remplace le message du défi par l'affichage de la première carte (Initial Draw)
				const initialDraw = MoreOrLessMessageBuilder.buildInitialDrawMessage(gameData);
				await interaction.update(initialDraw); // update permet de valider l'interaction immédiatement

				// Petite pause de suspense pour laisser les joueurs voir la carte
				await new Promise((r) => setTimeout(r, 4000));

				// On enregistre la partie (ce qui lance le timer) et on affiche le plateau
				container.moreOrLessService.registerGame(gameData);
				const gameMessage = MoreOrLessMessageBuilder.buildGameMessage(gameData);

				await interaction.message.edit(gameMessage);
				return;
			}

			if (action === 'decline') {
				const result = await container.moreOrLessService.declineChallenge(messageId, userId);

				if (!result.success) {
					return interaction.reply({
						embeds: [Embeds.errorEmbed({ title: 'T ki toi ?', message: result.error! })],
						flags: MessageFlags.Ephemeral
					});
				}

				const refusedContainer = new ContainerBuilder()
					.setAccentColor(colors.fail)
					.addTextDisplayComponents(
						new TextDisplayBuilder().setContent(
							`### ${emojis.redcheck} Proposition refusée\n<@${userId}> n'a pas accepté le défi...\nPeut-être une prochaine fois?`
						)
					);

				return interaction.update({
					components: [refusedContainer.toJSON()]
				});
			}
		}

		// =========================================================
		// 2. LOGIQUE DE JEU EN COURS (Plus / Moins)
		// =========================================================
		const game = container.moreOrLessService.getGame(messageId);
		if (!game) return interaction.reply({ content: 'Partie introuvable.', flags: MessageFlags.Ephemeral });

		if (game.currentTurnId !== userId) {
			return interaction.reply({
				embeds: [
					Embeds.errorEmbed({
						message: game.currentTurnId === 'bot' ? 'Le bot réfléchit...' : "Ce n'est pas ton tour !"
					})
				],
				flags: MessageFlags.Ephemeral
			});
		}

		const choice = action === 'more' ? 'more' : 'less';
		const result = await container.moreOrLessService.playTurn(messageId, userId, choice);

		if (result.status === 'error') {
			return interaction.reply({ content: result.message, flags: MessageFlags.Ephemeral });
		}

		if (game) {
			container.moreOrLessService.clearTimers(game); // 🔥 STOP le timer
		}

		const success = result.game!.lastTurnHistory!.success;

		// --- 1. PHASE DE REVEAL ---
		const revealMessage = MoreOrLessMessageBuilder.buildRevealMessage(userId, choice, result.drawnCard!, success);
		await interaction.update(revealMessage);

		// --- 2. SUSPENSE ---
		await new Promise((resolve) => setTimeout(resolve, 2500));
		container.moreOrLessService.clearTimers(game);

		// --- 3. REPRISE ---
		const isFinished = result.game!.status === 'finished';

		// Si ce n'est pas fini, on relance le timer AVANT de build le message
		if (!isFinished) {
			container.moreOrLessService.registerGame(result.game!);
		}

		const finalMessage = isFinished
			? MoreOrLessMessageBuilder.buildEndMessage(result.game!, result.winnerId!, result.loserId!)
			: MoreOrLessMessageBuilder.buildGameMessage(result.game!);

		await interaction.message.edit(finalMessage);

		// Si le jeu continue et que c'est au bot...
		if (!isFinished && result.game!.currentTurnId === 'bot') {
			// Le timer est déjà relancé par le registerGame au-dessus
			setTimeout(async () => {
				await container.moreOrLessService.handleBotTurn(messageId);
			}, 2000);
		}

		return;
	}
}
