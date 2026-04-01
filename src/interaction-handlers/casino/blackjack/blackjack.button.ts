import { InteractionHandler, InteractionHandlerTypes, container } from '@sapphire/framework';
import { ButtonInteraction, MessageFlags } from 'discord.js';
import { BlackjackMessageBuilder } from '../../../builders/BlackjackMessage.builder';

export class BlackjackButtonHandler extends InteractionHandler {
	public constructor(context: InteractionHandler.LoaderContext, options: InteractionHandler.Options) {
		super(context, { ...options, interactionHandlerType: InteractionHandlerTypes.Button });
	}

	public override parse(interaction: ButtonInteraction) {
		if (!interaction.customId.startsWith('bj:')) return this.none();
		return this.some();
	}

	public async run(interaction: ButtonInteraction) {
		const [, action, messageId] = interaction.customId.split(':');
		const game = container.blackjackService.getGame(messageId);

		if (!game) return interaction.reply({ content: 'Partie expirée.', flags: MessageFlags.Ephemeral });
		if (interaction.user.id !== game.userId) return interaction.reply({ content: 'Pas ta partie !', flags: MessageFlags.Ephemeral });

		await interaction.deferUpdate();

		if (action === 'hit') {
			const updatedGame = await container.blackjackService.hit(messageId);
			const response = await BlackjackMessageBuilder.buildGameMessage(updatedGame!);
			await interaction.editReply(response);
		} else {
			const updatedGame = await container.blackjackService.stand(messageId);
			const response = await BlackjackMessageBuilder.buildGameMessage(updatedGame);
			await interaction.editReply(response);
		}

		return;
	}
}
