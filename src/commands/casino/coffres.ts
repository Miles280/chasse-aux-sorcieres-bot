import { ApplyOptions } from '@sapphire/decorators';
import { Command, container } from '@sapphire/framework';
import { InteractionContextType, MessageFlags } from 'discord.js';
import { ChestMessageBuilder } from '../../builders/casino/ChestMessage.builder';
import * as Embeds from '../../utils/embeds';

@ApplyOptions<Command.Options>({
	name: 'coffres',
	description: 'Ouvre les coffres pour obtenir un meilleur multiplicateur, mais sans toucher les bombes !'
})
export class ChestCommand extends Command {
	public override registerApplicationCommands(registry: Command.Registry) {
		registry.registerChatInputCommand((builder) =>
			builder
				.setName(this.name)
				.setDescription(this.description)
				.setContexts([InteractionContextType.Guild])
				.addIntegerOption((opt) =>
					opt //
						.setName('mise')
						.setDescription('Montant de Rubis à miser')
						.setRequired(true)
						.setMinValue(10)
						.setMaxValue(500)
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

		// 3. Génère la grille de la partie (le Butin Global + les 5 Bombes)
		const grid = container.chestService.generateGrid();

		// 4. Objet de jeu initial
		const initialGameDisplay: any = {
			userId,
			bet,
			currentMultiplier: 1.0, // On commence à x1
			grid, // La grille cachée
			revealed: [], // Historique des cases cliquées (vide au départ)
			status: 'PLAYING' // PLAYING, WON, LOST
		};

		// 5. Construction du message (Container V2 + 5 Lignes de 5 Boutons)
		const messagePayload = ChestMessageBuilder.build(initialGameDisplay);

		// 6. Envoi du message
		const response = await interaction.reply({
			// ON SUPPRIME LE CONTENT !
			components: messagePayload.components,
			flags: MessageFlags.IsComponentsV2,
			withResponse: true
		});

		// 7. Récupération de l'ID pour l'interaction des boutons
		const messageId = response.resource!.message!.id;

		// 8. Enregistrement en base / cache
		return container.chestService.registerGame(messageId, interaction.channelId, userId, bet, grid);
	}
}
