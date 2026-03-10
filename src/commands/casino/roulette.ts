import { ApplyOptions } from '@sapphire/decorators';
import { Command } from '@sapphire/framework';
import { container } from '@sapphire/framework';
import { InteractionContextType, MessageFlags } from 'discord.js';
import { RouletteMessageBuilder } from '../../builders/RouletteMessage.builder';
import { ROULETTE_CONFIG } from '../../utils/constants';
import { RouletteGame } from '../../models/RouletteGame.interface';
import * as Embeds from '../../utils/embeds';

@ApplyOptions<Command.Options>({
	name: 'roulette',
	description: 'Lance une table de roulette dans le salon !'
})
export class RouletteCommand extends Command {
	public override registerApplicationCommands(registry: Command.Registry) {
		registry.registerChatInputCommand((builder) =>
			builder.setName(this.name).setDescription(this.description).setContexts([InteractionContextType.Guild])
		);
	}

	public override async chatInputRun(interaction: Command.ChatInputCommandInteraction) {
		const channelId = interaction.channelId;

		if (container.rouletteService.hasGameInChannel(channelId)) {
			return interaction.reply({
				embeds: [Embeds.errorEmbed({ message: 'Une roulette est déjà en cours de préparation dans ce salon !' })],
				flags: MessageFlags.Ephemeral
			});
		}

		const now = Date.now();
		const timeout = Number(ROULETTE_CONFIG.INITIAL_TIMER);
		const endsAt = now + timeout;

		// On utilise l'interface partielle/exacte sans le timer pour le builder
		const initialGame: RouletteGame = {
			channelId,
			messageId: '',
			status: 'betting',
			bets: [],
			endsAt,
			createdAt: now
		};

		const embed = RouletteMessageBuilder.buildGameEmbed(initialGame);
		const components = RouletteMessageBuilder.buildLobbyComponents();

		const message = await interaction.reply({
			embeds: [embed],
			components: components,
			fetchReply: true
		});

		return container.rouletteService.createLobby(message.id, channelId, endsAt, now);
	}
}
