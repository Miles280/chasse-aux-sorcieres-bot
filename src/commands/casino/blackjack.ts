import { Command } from '@sapphire/framework';
import { ApplyOptions } from '@sapphire/decorators';
import { container } from '@sapphire/framework';
import { BlackjackMessageBuilder } from '../../builders/casino/BlackjackMessage.builder';
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

		// 3. Prépare la réponse (obligatoire pour récupérer l'ID du message)
		await interaction.deferReply();
		const response = await interaction.fetchReply();

		// 4. Initialise la partie de Blackjack
		const game = await container.blackjackService.initGame(userId, bet, response.id, interaction.channelId!);

		if (!game) {
			return interaction.editReply('Erreur lors du mélange du deck.');
		}

		// 5. Construit le message de jeu (cartes, score, actions)
		const message = await BlackjackMessageBuilder.buildGameMessage(game);

		// 6. Met à jour le message avec l'état initial de la partie
		return interaction.editReply(message as any);
	}
}
