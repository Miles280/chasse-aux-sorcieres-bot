import { ApplyOptions } from '@sapphire/decorators';
import { InteractionHandler, InteractionHandlerTypes, container } from '@sapphire/framework';
import { ButtonInteraction, MessageFlags, GuildMember } from 'discord.js';
import { ChestMessageBuilder } from '../../../builders/casino/ChestMessage.builder';
import * as Embeds from '../../../utils/embeds';

@ApplyOptions<InteractionHandler.Options>({
	interactionHandlerType: InteractionHandlerTypes.Button
})
export class ChestButtonHandler extends InteractionHandler {
	public override parse(interaction: ButtonInteraction) {
		// On écoute uniquement les boutons dont l'ID commence par "rubisrush_"
		if (!interaction.customId.startsWith('chest:')) return this.none();
		return this.some();
	}

	public async run(interaction: ButtonInteraction) {
		const [, action, tile] = interaction.customId.split(':');
		const userId = interaction.user.id;

		// 1. Déterminer l'action (cashout ou clic sur une case)
		let actionToProcess: 'cashout' | number;
		if (action === 'cashout') {
			actionToProcess = action;
		} else {
			actionToProcess = Number(tile);
		}

		// 2. Traiter le tour via le service
		const result = await container.chestService.playTurn(interaction.message.id, userId, actionToProcess);

		// 3. Gérer les erreurs (ex: pas le bon joueur, partie introuvable/expirée)
		if (result.status === 'error') {
			return interaction.reply({
				embeds: [
					Embeds.errorEmbed({
						member: interaction.member as GuildMember,
						title: 'Accès refusé',
						message: result.message || 'Une erreur est survenue avec cette partie.'
					})
				],
				flags: MessageFlags.Ephemeral
			});
		}

		// 4. Récupérer l'état de la partie mis à jour
		const game = result.game!;

		// 5. Reconstruire le composant V2 via le Builder
		const messagePayload = ChestMessageBuilder.build(game);

		// 6. Mettre à jour le message
		return interaction.update({
			// On remplace les anciens composants par les nouveaux (la grille mise à jour)
			components: messagePayload.components,
			// ⚠️ On maintient le flag V2 pour que Discord accepte la modification du Container
			flags: MessageFlags.IsComponentsV2
		});
	}
}
