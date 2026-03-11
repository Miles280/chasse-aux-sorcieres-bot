import { ApplyOptions } from '@sapphire/decorators';
import { container, InteractionHandler, InteractionHandlerTypes } from '@sapphire/framework';
import { ButtonInteraction, EmbedBuilder, MessageFlags } from 'discord.js';
import { ROULETTE_CONFIG } from '../../utils/constants';
import { RouletteGame } from '../../models/RouletteGame.interface';
import { RouletteMessageBuilder } from '../../builders/RouletteMessage.builder';
import * as Embeds from '../../utils/embeds';

@ApplyOptions<InteractionHandler.Options>({
	interactionHandlerType: InteractionHandlerTypes.Button
})
export class RouletteButtonHandler extends InteractionHandler {
	public override parse(interaction: ButtonInteraction) {
		if (!interaction.customId.startsWith('roulette:')) return this.none();
		return this.some();
	}

	public async run(interaction: ButtonInteraction) {
		const customId = interaction.customId;

		// --- BOUTON D'AIDE ---
		// Affiche l'image de la table et les explications en éphémère.
		if (customId === 'roulette:help') {
			return interaction.reply({
				embeds: [
					new EmbedBuilder()
						.setDescription('**Comment jouer à la roulette :**\nVoici un exemple de table de roulette.')
						.setImage(`${process.env.BASE_URL}/assets/casino/roulette/roulette_table.png`)
				],
				flags: MessageFlags.Ephemeral
			});
		}

		// --- BOUTON REJOUER ---
		if (customId === 'roulette:button:playAgain') {
			const channelId = interaction.channelId;
			const game = container.rouletteService.getGameInChannel(channelId);

			// 1. Empêche la création d'une nouvelle partie si une est déjà active.
			if (game) {
				const messageLink = `https://discord.com/channels/${interaction.guildId}/${channelId}/${game.messageId}`;
				return interaction.reply({
					embeds: [
						Embeds.errorEmbed({
							title: 'Partie en cours...',
							message: `Une roulette est déjà en cours de préparation dans ce salon !\n> [Voir la roulette](${messageLink})`
						})
					],
					flags: MessageFlags.Ephemeral
				});
			}

			// 2. Initialisation des données de la nouvelle partie.
			const now = Date.now();
			const timeout = Number(ROULETTE_CONFIG.INITIAL_TIMER);
			const endsAt = now + timeout;

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

			// 3. Suppression immédiate du bouton sur le message précédent.
			await interaction.update({ components: [] });

			// 4. Envoi du nouveau lobby et enregistrement dans le service.
			const message = await interaction.followUp({
				embeds: [embed],
				components: components,
				withResponse: true
			});

			return container.rouletteService.createLobby(message.id, channelId, endsAt, now);
		}
	}
}
