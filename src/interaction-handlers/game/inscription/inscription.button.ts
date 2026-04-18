import { ApplyOptions } from '@sapphire/decorators';
import { container, InteractionHandler, InteractionHandlerTypes } from '@sapphire/framework';
import { ButtonInteraction, MessageFlags } from 'discord.js';
import { GameState, InscriptionAction, InscriptionInteractionContext } from '../../../models/Inscription.interface';

@ApplyOptions<InteractionHandler.Options>({
	interactionHandlerType: InteractionHandlerTypes.Button
})
export class InscriptionButtonHandler extends InteractionHandler {
	public override parse(interaction: ButtonInteraction) {
		return interaction.customId.startsWith('inscription:') ? this.some() : this.none();
	}

	public override async run(interaction: ButtonInteraction) {
		await interaction.deferUpdate();

		const [, action, state, gameId] = interaction.customId.split(':') as [string, InscriptionAction, GameState, string];
		const ctx: InscriptionInteractionContext = { action, state, gameId };

		// Dispatcher : On appelle la fonction correspondante à l'action
		return this.handleAction(interaction, ctx);
	}

	private async handleAction(interaction: ButtonInteraction, ctx: InscriptionInteractionContext) {
		const handlers: Record<InscriptionAction, (i: ButtonInteraction, c: InscriptionInteractionContext) => Promise<any>> = {
			join: this.handleJoin.bind(this),
			leave: this.handleLeave.bind(this),
			spectate: this.handleSpectate.bind(this)
		};

		const handler = handlers[ctx.action];
		if (!handler) return;

		return handler(interaction, ctx);
	}

	// --- Handlers privés ---

	private async handleJoin(interaction: ButtonInteraction, ctx: InscriptionInteractionContext) {
		if (ctx.state === 'closed' || ctx.state === 'started') {
			return interaction.followUp({ content: 'Trop tard ! Le portail est fermé.', flags: MessageFlags.Ephemeral });
		}
		return container.inscriptionService.processInscription(interaction, ctx, 'join');
	}

	private async handleLeave(interaction: ButtonInteraction, ctx: InscriptionInteractionContext) {
		if (ctx.state === 'started') {
			return interaction.followUp({ content: "On ne s'enfuit pas d'une partie en cours !", flags: MessageFlags.Ephemeral });
		}
		return container.inscriptionService.processInscription(interaction, ctx, 'leave');
	}

	private async handleSpectate(interaction: ButtonInteraction, ctx: InscriptionInteractionContext) {
		return container.inscriptionService.processInscription(interaction, ctx, 'spectate');
	}
}
