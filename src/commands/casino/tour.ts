import { ApplyOptions } from '@sapphire/decorators';
import { Command } from '@sapphire/framework';
import { container } from '@sapphire/framework';
import { InteractionContextType, MessageFlags } from 'discord.js';
import * as Embeds from '../../utils/embeds';
import { TowerMessageBuilder } from '../../builders/TowerMessage.builder';

@ApplyOptions<Command.Options>({
	name: 'tour',
	description: 'Jouez à la Tour de la Fortune !'
})
export class TowerCommand extends Command {
	public override registerApplicationCommands(registry: Command.Registry) {
		registry.registerChatInputCommand((builder) =>
			builder
				.setName(this.name)
				.setDescription(this.description)
				.setContexts([InteractionContextType.Guild])
				.addIntegerOption((opt) => opt.setName('mise').setDescription('Montant de Rubis a miser').setRequired(true).setMinValue(10))
		);
	}

	public override async chatInputRun(interaction: Command.ChatInputCommandInteraction) {
		const bet = interaction.options.getInteger('mise', true);
		const userId = interaction.user.id;

		// 1. Verif Argent (Comme avant)
		const check = await container.economyService.view(userId);
		if (!check.success || check.data.rubies < bet) {
			return interaction.reply({
				embeds: [Embeds.errorEmbed({ message: 'Pas assez de rubis !' })],
				flags: MessageFlags.Ephemeral
			});
		}

		// 2. Débit (Comme avant)
		const transaction = await container.casinoService.transaction(userId, bet, 'remove');
		if (!transaction.success) {
			return interaction.reply({
				embeds: [Embeds.errorEmbed({ message: 'Erreur de transaction.' })],
				flags: MessageFlags.Ephemeral
			});
		}

		// 3. Préparer la partie (SANS l'enregistrer tout de suite)
		// On demande juste la grille pour pouvoir l'afficher
		const grid = container.towerService.generateGrid();

		// On crée un objet "Faux" juste pour l'affichage initial (Floor 0, pas d'historique)
		const initialGameDisplay: any = {
			userId,
			bet,
			currentFloor: 0,
			grid,
			history: []
		};

		const embed = TowerMessageBuilder.buildGameEmbed(initialGameDisplay);
		const components = TowerMessageBuilder.buildComponents(initialGameDisplay, false);

		// 4. Envoyer le message
		const response = await interaction.reply({
			content: `**__Joueur__** : <@${userId}>`,
			embeds: [embed],
			components: components,
			withResponse: true
		});

		// 5. MAINTENANT on a l'ID du message, on démarre le moteur dans le service
		const messageId = response.resource!.message!.id;
		return container.towerService.registerGame(messageId, interaction.channelId, userId, bet, grid);
	}
}
