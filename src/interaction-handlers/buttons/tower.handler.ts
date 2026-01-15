import { ApplyOptions } from '@sapphire/decorators';
import { InteractionHandler, InteractionHandlerTypes, container } from '@sapphire/framework';
import { ButtonInteraction, GuildMember, MessageFlags } from 'discord.js';
import * as Embeds from '../../utils/embeds';

@ApplyOptions<InteractionHandler.Options>({
	interactionHandlerType: InteractionHandlerTypes.Button
})
export class TowerHandler extends InteractionHandler {
	public override parse(interaction: ButtonInteraction) {
		if (!interaction.customId.startsWith('tower_')) return this.none();
		return this.some();
	}

	public async run(interaction: ButtonInteraction) {
		// On split le customId : tower_action_param1_param2
		const [, action, ...params] = interaction.customId.split('_');

		// 1. CAS : REJOUER (playAgain)
		if (action === 'playAgain') {
			const [ownerId, betRaw] = params; // params[0] = discordId, params[1] = bet

			const bet = parseInt(betRaw);

			// Sécurité : Seul celui qui a lancé le jeu peut cliquer sur Rejouer
			if (interaction.user.id !== ownerId) {
				return interaction.reply({
					embeds: [
						Embeds.errorEmbed({
							member: interaction.member as GuildMember,
							title: 'Petite voleur vas',
							message: 'Il est pas pour toi ce bouton, si tu veux jouer fait le comme un grand avec /tour.'
						})
					],
					flags: MessageFlags.Ephemeral
				});
			}

			// 1. Vérifier si le joueur a assez de Rubis via l'API
			const response = await container.economyService.view(ownerId);
			if (response.error) {
				await interaction.reply({
					embeds: [Embeds.errorEmbed({ member: interaction.member as GuildMember, message: response.error })],
					flags: MessageFlags.Ephemeral
				});
				return;
			}
			const userBalance = response.balance!;
			if (userBalance.rubies < bet) {
				return interaction.reply({
					embeds: [
						Embeds.errorEmbed({
							member: interaction.member as GuildMember,
							title: 'Regardez le ce sale pauvre',
							message: 'Eh bah alors ? On as pas assez de Rubis pour jouer ?\n Aller dehors le gueux.'
						})
					],
					flags: MessageFlags.Ephemeral
				});
			}

			// 2. Déduire la mise immédiatement (important pour éviter les glitchs)
			const reponseCasino = await container.economyService.casino(ownerId, bet, 'remove');
			if (reponseCasino.error) {
				return interaction.reply({
					embeds: [Embeds.errorEmbed({ member: interaction.member as GuildMember, message: reponseCasino.error })],
					flags: MessageFlags.Ephemeral
				});
			}

			return container.towerService.createGame(interaction, bet);
		}

		// 2. CAS : JEU EN COURS (play ou stop)
		let choice: number | 'stop';
		if (action === 'stop') {
			choice = 'stop';
		} else {
			choice = parseInt(params[0]); // params[0] est l'index du bouton (0, 1 ou 2)
		}

		const result = await container.towerService.handleInput(interaction.message.id, interaction.user.id, choice);

		if (result.error) {
			return interaction.reply({
				embeds: [Embeds.errorEmbed({ member: interaction.member as GuildMember, message: result.error })],
				flags: MessageFlags.Ephemeral
			});
		}

		// Mise à jour de l'interface (Embed + Boutons)
		return interaction.update({ ...result.payload });
	}
}
