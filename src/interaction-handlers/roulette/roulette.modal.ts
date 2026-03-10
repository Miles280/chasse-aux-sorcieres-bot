import { ApplyOptions } from '@sapphire/decorators';
import { InteractionHandler, InteractionHandlerTypes, container } from '@sapphire/framework';
import { ModalSubmitInteraction, MessageFlags } from 'discord.js';
import * as Embeds from '../../utils/embeds';
import { RouletteBetType } from '../../models/RouletteGame.interface';
import { ROULETTE_CONFIG } from '../../utils/constants';
import { emojis } from '../../utils/emojis';

@ApplyOptions<InteractionHandler.Options>({
	interactionHandlerType: InteractionHandlerTypes.ModalSubmit
})
export class RouletteModalHandler extends InteractionHandler {
	public override parse(interaction: ModalSubmitInteraction) {
		if (!interaction.customId.startsWith('roulette:modal:')) return this.none();
		return this.some();
	}

	public async run(interaction: ModalSubmitInteraction) {
		const userId = interaction.user.id;
		const channelId = interaction.channelId;
		const [, , betTypeString] = interaction.customId.split(':');

		// 1. Vérifie qu'une partie de roulette est active dans ce salon
		if (!container.rouletteService.hasGameInChannel(channelId!)) {
			return interaction.reply({
				embeds: [Embeds.errorEmbed({ message: 'Le temps est écoulé ou la table est fermée !' })],
				flags: MessageFlags.Ephemeral
			});
		}

		// 2. Récupération et vérification du montant
		const amountStr = interaction.fields.getTextInputValue('amount');
		const amount = parseInt(amountStr, 10);

		if (isNaN(amount)) {
			return interaction.reply({
				embeds: [Embeds.errorEmbed({ message: 'Le montant doit être un nombre valide.' })],
				flags: MessageFlags.Ephemeral
			});
		}

		if (amount < ROULETTE_CONFIG.MIN_BET || amount > ROULETTE_CONFIG.MAX_BET) {
			return interaction.reply({
				embeds: [
					Embeds.errorEmbed({
						message: `La mise doit être comprise entre **${ROULETTE_CONFIG.MIN_BET}** et **${ROULETTE_CONFIG.MAX_BET}** ${emojis.rubies}.`
					})
				],
				flags: MessageFlags.Ephemeral
			});
		}

		// 3. Détermination du type de mise
		let finalBetType: RouletteBetType = betTypeString as RouletteBetType;

		if (betTypeString === 'number') {
			const numberChoiceStr = interaction.fields.getTextInputValue('number_choice');
			const numberChoice = parseInt(numberChoiceStr, 10);

			if (isNaN(numberChoice) || numberChoice < 0 || numberChoice > 36) {
				return interaction.reply({
					embeds: [Embeds.errorEmbed({ message: 'Le numéro choisi doit être strictement compris entre **0 et 36**.' })],
					flags: MessageFlags.Ephemeral
				});
			}

			finalBetType = numberChoice;
		}

		// 4. Vérifie que le joueur possède assez de rubis
		const check = await container.economyService.view(userId);

		if (!check.success || check.data.rubies < amount) {
			return interaction.reply({
				embeds: [Embeds.errorEmbed({ message: "Tu n'as pas assez de rubis pour placer cette mise !" })],
				flags: MessageFlags.Ephemeral
			});
		}

		// 5. Débite la mise
		const transaction = await container.casinoService.transaction(userId, amount, 'remove');

		if (!transaction.success) {
			return interaction.reply({
				embeds: [Embeds.errorEmbed({ message: 'Erreur lors du débit de ta mise.' })],
				flags: MessageFlags.Ephemeral
			});
		}

		// 6. Enregistre la mise dans la partie
		const betResult = await container.rouletteService.addBet(channelId!, userId, amount, finalBetType);

		if (!betResult) {
			await container.casinoService.transaction(userId, amount, 'add');

			return interaction.reply({
				embeds: [Embeds.errorEmbed({ title: 'Trop tard', message: 'Les mises sont fermées.' })],
				flags: MessageFlags.Ephemeral
			});
		}

		// 7. Confirmation au joueur
		return interaction.reply({
			embeds: [
				Embeds.successEmbed({
					title: 'Mise enregistrée',
					message: `Ta mise de **${amount}** ${emojis.rubies} a bien été enregistrée. Bonne chance !`
				})
			],
			flags: MessageFlags.Ephemeral
		});
	}
}
