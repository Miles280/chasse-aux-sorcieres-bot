import { ApplyOptions } from '@sapphire/decorators';
import { InteractionHandler, InteractionHandlerTypes, container } from '@sapphire/framework';
import { ButtonInteraction, MessageFlags, GuildMember } from 'discord.js';
import { BlackjackMessageBuilder } from '../../../builders/casino/BlackjackMessage.builder';
import * as Embeds from '../../../utils/embeds';

@ApplyOptions<InteractionHandler.Options>({
	interactionHandlerType: InteractionHandlerTypes.Button
})
export class BlackjackButtonHandler extends InteractionHandler {
	public override parse(interaction: ButtonInteraction) {
		if (!interaction.customId.startsWith('bj:')) return this.none();
		return this.some();
	}

	public async run(interaction: ButtonInteraction) {
		const [, action, ...params] = interaction.customId.split(':');
		const userId = interaction.user.id;

		// 1. Cas Rejouer
		if (action === 'replay') {
			const bet = parseInt(params[0]);
			const ownerId = params[1];

			// 1.1 Vérifie que c'est le joueur d'origine
			if (userId !== ownerId) {
				return interaction.reply({
					embeds: [
						Embeds.errorEmbed({
							member: interaction.member as GuildMember,
							title: 'Petit voleur !',
							message: "Ce bouton n'est pas pour toi. Lance une nouvelle partie avec `/blackjack`."
						})
					],
					flags: MessageFlags.Ephemeral
				});
			}

			// 1.2 Vérifie que le joueur a assez de rubis
			const check = await container.economyService.view(userId);
			if (!check.success || check.data.rubies < bet) {
				return interaction.reply({
					embeds: [Embeds.errorEmbed({ title: 'Sale pauvre...', message: 'Pas assez de rubis pour rejouer !' })],
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

			// 1.4 Préparation de la nouvelle partie
			await interaction.message.edit({ components: [] });
			await interaction.deferReply();
			const response = await interaction.fetchReply();

			// 1.5 Initialisation via le service
			const game = await container.blackjackService.initGame(userId, bet, response.id, interaction.channelId!);
			if (!game) {
				return interaction.followUp({
					embeds: [Embeds.errorEmbed({ message: 'Erreur lors du mélange du deck.' })],
					flags: MessageFlags.Ephemeral
				});
			}

			// 1.6 Construction et envoi du message
			const msg = await BlackjackMessageBuilder.buildGameMessage(game);
			await interaction.editReply(msg as any);

			// 1.7 Gestion du timeout si terminé (Blackjack instantané)
			if (game.status === 'finished') this.setupReplayTimeout(interaction);
			return;
		}

		// 2. Récupération de la partie en cours
		const messageId = params[0];
		const game = container.blackjackService.getGame(messageId);

		// 3. Vérifications de sécurité
		if (!game) return interaction.reply({ embeds: [Embeds.errorEmbed({ message: 'Partie expirée.' })], flags: MessageFlags.Ephemeral });
		if (userId !== game.userId) return interaction.reply({ content: 'Pas ta partie !', flags: MessageFlags.Ephemeral });

		// 4. Exécution de l'action de jeu
		await interaction.deferUpdate();
		let updatedGame;

		if (action === 'hit') {
			updatedGame = await container.blackjackService.hit(messageId);
		} else if (action === 'double') {
			updatedGame = await container.blackjackService.doubleDown(messageId);
			if (!updatedGame) {
				return interaction.followUp({
					embeds: [Embeds.errorEmbed({ message: "Tu n'as pas assez de rubis pour doubler la mise !" })],
					flags: MessageFlags.Ephemeral
				});
			}
		} else if (action === 'stand') {
			updatedGame = await container.blackjackService.stand(messageId);
		}

		// 5. Mise à jour du message et gestion de la fin
		if (updatedGame) {
			const response = await BlackjackMessageBuilder.buildGameMessage(updatedGame);
			await interaction.editReply(response);

			if (updatedGame.status === 'finished') {
				this.setupReplayTimeout(interaction);
			}
		}

		return;
	}

	/**
	 * Supprime les boutons après 60 secondes d'inactivité en fin de partie
	 */
	private setupReplayTimeout(interaction: ButtonInteraction) {
		setTimeout(() => {
			interaction.editReply({ components: [] }).catch(() => null);
		}, 60000);
	}
}
