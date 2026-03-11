import { ApplyOptions } from '@sapphire/decorators';
import { InteractionHandler, InteractionHandlerTypes, container } from '@sapphire/framework';
import { ButtonInteraction, MessageFlags, EmbedBuilder, GuildMember } from 'discord.js';
import { TowerMessageBuilder } from '../../builders/TowerMessage.builder';
import { TOWER_CONFIG } from '../../utils/constants';
import * as Embeds from '../../utils/embeds';

@ApplyOptions<InteractionHandler.Options>({
	interactionHandlerType: InteractionHandlerTypes.Button
})
export class TowerButtonHandler extends InteractionHandler {
	public override parse(interaction: ButtonInteraction) {
		if (!interaction.customId.startsWith('tower:')) return this.none();
		return this.some();
	}

	public async run(interaction: ButtonInteraction) {
		const [, action, ...params] = interaction.customId.split(':');
		const userId = interaction.user.id;

		// 1. Cas Rejouer
		if (action === 'playAgain') {
			const [ownerId, betStr] = params;
			const bet = parseInt(betStr);

			// 1.1 Vérifie que c'est le joueur d'origine
			if (userId !== ownerId) {
				return interaction.reply({
					embeds: [
						Embeds.errorEmbed({
							member: interaction.member as GuildMember,
							title: 'Petit voleur !',
							message: "Ce bouton n'est pas pour toi. Lance une nouvelle partie avec /tour."
						})
					],
					flags: MessageFlags.Ephemeral
				});
			}

			// 1.2 Vérifie que le joueur a assez de rubis
			const check = await container.economyService.view(userId);
			if (!check.success || check.data.rubies < bet) {
				return interaction.reply({
					embeds: [Embeds.errorEmbed({ message: 'Pas assez de rubis pour rejouer !' })],
					flags: MessageFlags.Ephemeral
				});
			}

			// 1.3 Débiter la mise
			const transaction = await container.casinoService.transaction(userId, bet, 'remove');
			if (!transaction.success) {
				return interaction.reply({
					embeds: [Embeds.errorEmbed({ message: 'Erreur lors du débit de la mise.' })],
					flags: MessageFlags.Ephemeral
				});
			}

			// 1.4 Générer une nouvelle grille et initialiser la partie
			await interaction.update({ components: [] }); // Suppression du bouton pour rejouer avant de lancer la nouvelle partie

			const grid = container.towerService.generateGrid();
			const gameData: any = { userId, bet, currentFloor: 0, grid, history: [] };

			// 1.5 Construire l'embed et les boutons
			const embed = TowerMessageBuilder.buildGameEmbed(gameData);
			const components = TowerMessageBuilder.buildComponents(gameData, false);

			// 1.6 Envoyer un nouveau message pour la partie
			const newMessage = await interaction.followUp({
				content: `**Joueur :** <@${userId}>`,
				embeds: [embed],
				components
			});

			// 1.7 Enregistrer la partie dans le service
			return container.towerService.registerGame(newMessage.id, interaction.channelId, userId, bet, grid);
		}

		// 2. Déterminer le choix du joueur
		const choice: number | 'stop' = action === 'stop' ? 'stop' : parseInt(params[1]);

		// 3. Jouer le tour via le service
		const result = await container.towerService.playTurn(interaction.message.id, userId, choice);

		// 4. Gérer les erreurs
		if (result.status === 'error') {
			return interaction.reply({ content: result.message, flags: MessageFlags.Ephemeral });
		}

		// 5. Sélectionner l'embed selon le résultat
		const game = result.game!;
		const isFinished = result.status !== 'continue';
		const embed: EmbedBuilder = isFinished
			? TowerMessageBuilder.buildEndEmbed(game, result.status as 'win' | 'lose' | 'cashout', result.payout ?? 0, result.badChoice)
			: TowerMessageBuilder.buildGameEmbed(game);

		// 6. Générer les boutons
		const components = TowerMessageBuilder.buildComponents(game, isFinished);

		// 7. Mettre à jour le message
		await interaction.update({
			content: `**Joueur :** <@${userId}>`,
			embeds: [embed],
			components
		});

		// 8. Timeout automatique si la partie est terminée
		if (isFinished) {
			const reply = await interaction.fetchReply();
			const collector = reply.createMessageComponentCollector({ time: TOWER_CONFIG.TIMEOUT_MS, max: 1 });

			collector.on('end', async (_collected, reason) => {
				if (reason === 'time') {
					try {
						await interaction.editReply({ components: [] });
					} catch {
						// Message supprimé, on ignore
					}
				}
			});
		}
	}
}
