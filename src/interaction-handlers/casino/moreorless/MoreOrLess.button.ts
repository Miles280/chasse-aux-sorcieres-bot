import { ApplyOptions } from '@sapphire/decorators';
import { InteractionHandler, InteractionHandlerTypes, container } from '@sapphire/framework';
import { ButtonInteraction, ContainerBuilder, MessageFlags, TextDisplayBuilder } from 'discord.js';
import { MoreOrLessMessageBuilder } from '../../../builders/MoreOrLessMessage.builder';
import * as Embeds from '../../../utils/embeds';
import { colors } from '../../../utils/customColors';
import { emojis } from '../../../utils/emojis';

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
		// 1. GESTION DES DÉFIS (accept / decline)
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

				const game = result.game!;

				// 1.1 Affichage tirage initial
				await interaction.update(MoreOrLessMessageBuilder.buildInitialDrawMessage(game));

				// 1.2 Pause (suspense)
				await new Promise((r) => setTimeout(r, 4000));

				// 1.3 Lancement partie
				container.moreOrLessService.registerGame(game);
				await interaction.message.edit(MoreOrLessMessageBuilder.buildGameMessage(game));

				return;
			}

			if (action === 'decline') {
				const result = await container.moreOrLessService.declineChallenge(messageId, userId);

				if (!result.success) {
					return interaction.reply({
						embeds: [Embeds.errorEmbed({ message: result.error! })],
						flags: MessageFlags.Ephemeral
					});
				}

				const refused = new ContainerBuilder()
					.setAccentColor(colors.fail)
					.addTextDisplayComponents(
						new TextDisplayBuilder().setContent(`### ${emojis.redcheck} Proposition refusée\n<@${userId}> a refusé le défi.`)
					);

				return interaction.update({
					components: [refused.toJSON()]
				});
			}
		}

		// =========================================================
		// 2. JEU EN COURS (plus / moins)
		// =========================================================
		const game = container.moreOrLessService.getGame(messageId);

		if (!game) {
			return interaction.reply({
				content: 'Partie introuvable.',
				flags: MessageFlags.Ephemeral
			});
		}

		// 2.1 Vérification du tour
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

		const choice: 'more' | 'less' = action === 'more' ? 'more' : 'less';

		// 2.2 Jouer le tour
		const result = await container.moreOrLessService.playTurn(messageId, userId, choice);

		if (result.status === 'error') {
			return interaction.reply({
				content: result.message,
				flags: MessageFlags.Ephemeral
			});
		}

		// Stop timer actuel
		container.moreOrLessService.clearTimers(game);

		const success = result.game!.lastTurnHistory!.success;

		// =========================================================
		// 3. PHASE REVEAL
		// =========================================================
		await interaction.update(MoreOrLessMessageBuilder.buildRevealMessage(userId, choice, result.drawnCard!, success));

		// Suspense
		await new Promise((r) => setTimeout(r, 2500));

		// =========================================================
		// 4. RÉSOLUTION DU TOUR
		// =========================================================
		const updatedGame = result.game!;
		const isFinished = updatedGame.status === 'finished';

		if (!isFinished) {
			container.moreOrLessService.registerGame(updatedGame);
		}

		const finalMessage = isFinished
			? MoreOrLessMessageBuilder.buildEndMessage(updatedGame, result.winnerId!, result.loserId!)
			: MoreOrLessMessageBuilder.buildGameMessage(updatedGame);

		await interaction.message.edit(finalMessage);

		// =========================================================
		// 5. TOUR DU BOT
		// =========================================================
		if (!isFinished && updatedGame.currentTurnId === 'bot') {
			setTimeout(() => {
				container.moreOrLessService.handleBotTurn(messageId);
			}, 2000);
		}

		return;
	}
}
