import { Command } from '@sapphire/framework';
import { ApplyOptions } from '@sapphire/decorators';
import { container } from '@sapphire/framework';
import { BlackjackMessageBuilder } from '../../builders/BlackjackMessage.builder';
import { InteractionContextType, MessageFlags } from 'discord.js';
import * as Embeds from '../../utils/embeds';

@ApplyOptions<Command.Options>({
	name: 'blackjack',
	description: 'Joue au Blackjack'
})
export class BlackjackCommand extends Command {
	public override registerApplicationCommands(registry: Command.Registry) {
		registry.registerChatInputCommand((builder) =>
			builder
				.setName(this.name)
				.setDescription(this.description)
				.setContexts([InteractionContextType.Guild])
				.addIntegerOption((opt) =>
					opt //
						.setName('mise')
						.setDescription('Le montant à parier')
						.setRequired(true)
						.setMinValue(10)
						.setMaxValue(250)
				)
		);
	}

	public override async chatInputRun(interaction: Command.ChatInputCommandInteraction) {
		const bet = interaction.options.getInteger('mise', true);
		const userId = interaction.user.id;

		// 1. Vérifie que le joueur a assez de rubis
		const check = await container.economyService.view(userId);
		if (!check.success || check.data.rubies < bet) {
			return interaction.reply({
				embeds: [Embeds.errorEmbed({ message: 'Pas assez de rubis !' })],
				flags: MessageFlags.Ephemeral
			});
		}

		// 2. Débite la mise
		const transaction = await container.casinoService.transaction(userId, bet, 'remove');
		if (!transaction.success) {
			return interaction.reply({
				embeds: [Embeds.errorEmbed({ message: 'Erreur de transaction.' })],
				flags: MessageFlags.Ephemeral
			});
		}

		await interaction.deferReply();
		const response = await interaction.fetchReply();

		const game = await container.blackjackService.initGame(userId, bet, response.id);

		if (!game) return interaction.editReply('Erreur lors du mélange du deck.');

		const msg = await BlackjackMessageBuilder.buildGameMessage(game);
		return interaction.editReply(msg as any);
	}
}
