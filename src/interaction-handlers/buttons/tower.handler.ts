import { ApplyOptions } from '@sapphire/decorators';
import { InteractionHandler, InteractionHandlerTypes, container } from '@sapphire/framework';
import { ButtonInteraction, EmbedBuilder, GuildMember, MessageFlags } from 'discord.js';
import * as Embeds from '../../utils/embeds';
import { TowerMessageBuilder } from '../../builders/TowerMessage.builder';
import { TOWER_CONFIG } from '../../utils/constants';

@ApplyOptions<InteractionHandler.Options>({
	interactionHandlerType: InteractionHandlerTypes.Button
})
export class TowerHandler extends InteractionHandler {
	public override parse(interaction: ButtonInteraction) {
		if (!interaction.customId.startsWith('tower:')) return this.none();
		return this.some();
	}

	public async run(interaction: ButtonInteraction) {
		// On split le customId : tower:<action>:<ownerId>:<value?>
		const [, action, ...params] = interaction.customId.split(':');

		const userId = interaction.user.id;

		// Gérer le "Rejouer"
		if (action === 'playAgain') {
			const [ownerId, betStr] = params;
			// 1. Récupération des données depuis les params du bouton
			const bet = parseInt(betStr);

			// 2. Sécurité : Seul celui qui a lancé le jeu peut cliquer sur Rejouer
			if (userId !== ownerId) {
				return interaction.reply({
					embeds: [
						Embeds.errorEmbed({
							member: interaction.member as GuildMember,
							title: 'Petit voleur vas !',
							message: "Il n'est pas pour toi ce bouton, si tu veux jouer fait le comme un grand avec /tour."
						})
					],
					flags: MessageFlags.Ephemeral
				});
			}

			// 3. Vérification de l'argent (via EconomyService)
			const check = await container.economyService.view(userId);
			if (!check.success || check.data.rubies < bet) {
				return interaction.reply({
					embeds: [Embeds.errorEmbed({ message: 'Pas assez de rubis pour rejouer !' })],
					flags: MessageFlags.Ephemeral
				});
			}

			// 4. Débit de la mise (via CasinoService)
			const transaction = await container.casinoService.transaction(userId, bet, 'remove');
			if (!transaction.success) {
				return interaction.reply({
					embeds: [Embeds.errorEmbed({ message: 'Erreur lors du débit de la mise.' })],
					flags: MessageFlags.Ephemeral
				});
			}

			await interaction.update({ components: [] });

			// 5. Préparation de la nouvelle partie
			const grid = container.towerService.generateGrid();

			// On utilise notre Builder avec un objet temporaire
			const initialGameData: any = {
				userId,
				bet,
				currentFloor: 0,
				grid,
				history: []
			};

			const embed = TowerMessageBuilder.buildGameEmbed(initialGameData);
			const components = TowerMessageBuilder.buildComponents(initialGameData, false);

			// 6. Envoi de la nouvelle partie
			// Note : On fait un reply() et non un update() car on veut créer un NOUVEAU message
			// pour que l'utilisateur puisse voir son historique de jeu dans le salon.
			const newMessage = await interaction.followUp({
				content: `<@${userId}>`,
				embeds: [embed],
				components: components
			});

			// 7. Enregistrement dans le Service
			return container.towerService.registerGame(newMessage.id, interaction.channelId, userId, bet, grid);
		}

		// Déterminer le choix
		let choice: number | 'stop';
		if (action === 'stop') choice = 'stop';
		else choice = parseInt(params[1]);

		// 1. Appeler le Service
		const result = await container.towerService.playTurn(interaction.message.id, interaction.user.id, choice);

		// 2. Gestion d'erreur (Partie non trouvée, mauvais utilisateur, etc.)
		if (result.status === 'error') {
			return interaction.reply({ content: result.message, flags: MessageFlags.Ephemeral });
		}

		// 3. Si tout va bien, on utilise le Builder pour mettre à jour l'image
		const game = result.game!;
		let embed: EmbedBuilder;
		let isFinished = false;

		// 3. Sélection de l'Embed en fonction du résultat
		if (result.status === 'continue') {
			// La partie continue : Embed de jeu classique
			embed = TowerMessageBuilder.buildGameEmbed(game);
		} else {
			// La partie est finie (win, lose, ou cashout)
			isFinished = true;
			embed = TowerMessageBuilder.buildEndEmbed(game, result.status as 'win' | 'lose' | 'cashout', result.payout ?? 0, result.badChoice);
		}

		// 4. Génération des boutons (le builder gère déjà le switch interne via isFinished)
		const components = TowerMessageBuilder.buildComponents(game, isFinished);

		// 5. Mise à jour du message
		await interaction.update({
			content: `<@${userId}>`,
			embeds: [embed],
			components: components
		});

		// --- LOGIQUE DE DÉSACTIVATION AUTOMATIQUE (1 MINUTE) ---
		if (isFinished) {
			// On récupère la réponse qu'on vient de mettre à jour
			const reply = await interaction.fetchReply();

			// On crée un collecteur qui attend 60 secondes
			const collector = reply.createMessageComponentCollector({
				time: TOWER_CONFIG.TIMEOUT_MS,
				max: 1
			});

			collector.on('end', async (_collected, reason) => {
				if (reason === 'time') {
					try {
						await interaction.editReply({ components: [] });
					} catch (err) {
						// On ignore si le message a été supprimé entre temps
					}
				}
			});
		}
	}
}
