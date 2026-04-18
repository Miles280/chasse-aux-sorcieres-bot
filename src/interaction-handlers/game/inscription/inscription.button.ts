import { ApplyOptions } from '@sapphire/decorators';
import { InteractionHandler, InteractionHandlerTypes } from '@sapphire/framework';
import { ButtonInteraction, GuildTextBasedChannel, MessageFlags } from 'discord.js';
import { container } from '@sapphire/framework';
import { InscriptionMessageBuilder } from '../../../builders/game/InscriptionMessage.builder';
import * as Embeds from '../../../utils/embeds';

type InscriptionAction = 'join' | 'leave' | 'spectate';
type GameState = 'opened' | 'closed' | 'started';

interface InteractionContext {
	action: InscriptionAction;
	state: GameState;
	gameId: string;
}

@ApplyOptions<InteractionHandler.Options>({
	interactionHandlerType: InteractionHandlerTypes.Button
})
export class HistoryPaginationHandler extends InteractionHandler {
	public override parse(interaction: ButtonInteraction) {
		return interaction.customId.startsWith('inscription:') ? this.some() : this.none();
	}

	public override async run(interaction: ButtonInteraction) {
		await interaction.deferUpdate();

		const [, action, state, gameId] = interaction.customId.split(':') as [string, InscriptionAction, GameState, string];
		const ctx: InteractionContext = { action, state, gameId };

		// Dispatcher : On appelle la fonction correspondante à l'action
		return this.handleAction(interaction, ctx);
	}

	private async handleAction(interaction: ButtonInteraction, ctx: InteractionContext) {
		const handlers: Record<InscriptionAction, (i: ButtonInteraction, c: InteractionContext) => Promise<any>> = {
			join: this.handleJoin.bind(this),
			leave: this.handleLeave.bind(this),
			spectate: this.handleSpectate.bind(this)
		};

		const handler = handlers[ctx.action];
		if (!handler) return;

		return handler(interaction, ctx);
	}

	// --- Handlers privés ---

	private async handleJoin(interaction: ButtonInteraction, ctx: InteractionContext) {
		if (ctx.state === 'closed' || ctx.state === 'started') {
			return interaction.followUp({ content: 'Trop tard ! Le portail est fermé.', flags: MessageFlags.Ephemeral });
		}
		return this.processInscription(interaction, ctx, 'join');
	}

	private async handleLeave(interaction: ButtonInteraction, ctx: InteractionContext) {
		if (ctx.state === 'started') {
			return interaction.followUp({ content: "On ne s'enfuit pas d'une partie en cours !", flags: MessageFlags.Ephemeral });
		}
		return this.processInscription(interaction, ctx, 'leave');
	}

	private async handleSpectate(interaction: ButtonInteraction, ctx: InteractionContext) {
		return this.processInscription(interaction, ctx, 'spectate');
	}

	/**
	 * Le "Cerveau" qui appelle l'API et rafraîchit les embeds
	 */
	private async processInscription(interaction: ButtonInteraction, ctx: InteractionContext, action: 'join' | 'leave' | 'spectate') {
		// 1. Appel API
		const response = await container.inscriptionService.inscription(Number(ctx.gameId), interaction.user.id, action);

		if (!response.success) {
			return interaction.followUp({
				embeds: [Embeds.errorEmbed({ title: 'Action refusée', message: response.error })],
				flags: MessageFlags.Ephemeral
			});
		}

		const gameData = response.data;

		// 2. Récupération de la config (pour avoir les IDs des salons)
		const config = await container.serverConfigService.getConfig(interaction.guildId!);
		if (!config.success) return;

		// 3. MISE À JOUR DU MESSAGE PUBLIC (celui où on a cliqué)
		let publicPayload;
		switch (ctx.state) {
			case 'opened':
				// Note: ici il faudra peut-être gérer maxPlayers/remainingTime s'ils sont stockés en base
				publicPayload = InscriptionMessageBuilder.buildOpened(gameData, config.data.inscriptionVoiceChannelId!, null, null);
				break;
			case 'closed':
				publicPayload = InscriptionMessageBuilder.buildClosed(gameData, config.data.inscriptionVoiceChannelId!);
				break;
			default:
				publicPayload = InscriptionMessageBuilder.buildStarted(gameData);
		}

		await interaction.editReply(publicPayload);

		// 4. MISE À JOUR DU MESSAGE MJ (Composition)
		if (config.data.gameMjChannelId && gameData.compoMessageId) {
			try {
				const mjChannel = (await interaction.guild?.channels.fetch(config.data.gameMjChannelId)) as GuildTextBasedChannel;
				const compoMsg = await mjChannel.messages.fetch(gameData.compoMessageId);

				const compoPayload = InscriptionMessageBuilder.buildCompo(gameData);
				await compoMsg.edit(compoPayload);
			} catch (err) {
				console.error('Impossible de mettre à jour le message de compo MJ:', err);
			}
		}

		const successMessages: Record<string, string> = {
			join: "Tu rejoins la Chasse aux Sorcières. Prépare-toi à purger le village de la souillure qui l'infeste !",
			leave: 'Ton courage vacille... Tu fuis le chaos comme un faible.',
			spectate: 'Tu te fonds dans les ombres... Le chaos sera ton seul spectacle.'
		};

		return interaction.followUp({
			embeds: [Embeds.successEmbed({ title: 'Action effectué', message: successMessages[action] })],
			flags: MessageFlags.Ephemeral
		});
	}
}
