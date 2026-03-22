import { ApplyOptions } from '@sapphire/decorators';
import { InteractionHandler, InteractionHandlerTypes, container } from '@sapphire/framework';
import { ButtonInteraction, MessageFlags } from 'discord.js';
import { MoreOrLessMessageBuilder } from '../../builders/MoreOrLessMessage.builder';
import * as Embeds from '../../utils/embeds';

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

		if (!isFinished) {
			container.moreOrLessService.registerGame(result.game!);
		}

		const finalMessage = isFinished
			? MoreOrLessMessageBuilder.buildEndMessage(result.game!, result.winnerId!, result.loserId!)
			: MoreOrLessMessageBuilder.buildGameMessage(result.game!);

		await interaction.message.edit(finalMessage);

		// Si le jeu continue...
		if (!isFinished && result.game!.currentTurnId === 'bot') {
			container.moreOrLessService.registerGame(result.game!); // Relance le timer

			// Si c'est au bot de jouer, on lui laisse 2 secondes puis il joue
			if (result.game!.currentTurnId === 'bot') {
				setTimeout(async () => {
					await container.moreOrLessService.handleBotTurn(messageId);
				}, 2000);
			}
		}

		return;
	}
}
