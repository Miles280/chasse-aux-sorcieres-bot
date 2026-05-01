import { ApplyOptions } from '@sapphire/decorators';
import { Command } from '@sapphire/framework';
import { container } from '@sapphire/framework';
import { InteractionContextType, MessageFlags } from 'discord.js';
import * as Embeds from '../../utils/embeds';
import { TowerMessageBuilder } from '../../builders/casino/TowerMessage.builder';

@ApplyOptions<Command.Options>({
	name: 'tour',
	description: 'Joue à la Tour de la Fortune !'
})
export class TowerCommand extends Command {
	public override registerApplicationCommands(registry: Command.Registry) {
		registry.registerChatInputCommand((builder) =>
			builder
				.setName(this.name)
				.setDescription(this.description)
				.setContexts([InteractionContextType.Guild])
				.addIntegerOption((opt) =>
					opt.setName('mise').setDescription('Montant de Rubis a miser').setRequired(true).setMinValue(10).setMaxValue(200)
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

		// 3. Génère la grille de la partie
		const grid = container.towerService.generateGrid();

		// 4. Objet temporaire utilisé juste pour l'affichage initial
		const initialGameDisplay: any = {
			userId,
			bet,
			currentFloor: 0,
			grid,
			history: []
		};

		// 5. Construction du message de jeu
		const embed = TowerMessageBuilder.buildGameEmbed(initialGameDisplay);
		const components = TowerMessageBuilder.buildComponents(initialGameDisplay, false);

		// 6. Envoi du message (avec récupération de la réponse)
		const response = await interaction.reply({
			content: `**__Joueur__** : <@${userId}>`,
			embeds: [embed],
			components: components,
			withResponse: true
		});

		// 7. Récupère l'ID du message pour enregistrer la partie
		const messageId = response.resource!.message!.id;

		// 8. Enregistre la partie dans le service
		return container.towerService.registerGame(messageId, interaction.channelId, userId, bet, grid);
	}
}
