import { ApplyOptions } from '@sapphire/decorators';
import { InteractionHandler, InteractionHandlerTypes, container } from '@sapphire/framework';
import { ModalSubmitInteraction, MessageFlags } from 'discord.js';
import { RouletteBetType } from '../../models/RouletteGame.interface';
import { ROULETTE_CONFIG } from '../../utils/constants';
import { emojis } from '../../utils/emojis';
import * as Embeds from '../../utils/embeds';

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

		// 1. Vérification de l'existence de la partie
		const game = container.rouletteService.getGameInChannel(channelId!);
		if (!game) {
			return interaction.reply({
				embeds: [Embeds.errorEmbed({ message: 'Le temps est écoulé ou la table est fermée !' })],
				flags: MessageFlags.Ephemeral
			});
		}

		// 2. Récupération et parsing du montant de la mise
		const amountStr = interaction.fields.getTextInputValue('amount');
		const amount = parseInt(amountStr, 10);

		if (isNaN(amount) || amount <= 0) {
			return interaction.reply({
				embeds: [Embeds.errorEmbed({ message: 'Le montant doit être un nombre valide.' })],
				flags: MessageFlags.Ephemeral
			});
		}

		// 3. Détermination précise du type de mise (Catégorie ou Numéro)
		let finalBetType: RouletteBetType = betTypeString as RouletteBetType;

		if (betTypeString === 'number') {
			const numberChoiceStr = interaction.fields.getTextInputValue('number_choice');
			const numberChoice = parseInt(numberChoiceStr, 10);

			if (isNaN(numberChoice) || numberChoice < 0 || numberChoice > 36) {
				return interaction.reply({
					embeds: [Embeds.errorEmbed({ message: 'Le numéro choisi doit être compris entre **0 et 36**.' })],
					flags: MessageFlags.Ephemeral
				});
			}
			finalBetType = numberChoice;
		}

		// 4. Vérification du plafond par emplacement (Type de mise spécifique)
		// On cherche uniquement les mises du joueur sur CE type (ex: uniquement ses mises sur 'red')
		const existingBetsOnType = game.bets.filter((bet) => bet.userId === userId && bet.type === finalBetType);
		const currentTotalOnType = existingBetsOnType.reduce((sum, bet) => sum + bet.amount, 0);
		const remainingOnType = ROULETTE_CONFIG.MAX_BET - currentTotalOnType;

		if (amount + currentTotalOnType > ROULETTE_CONFIG.MAX_BET) {
			return interaction.reply({
				embeds: [
					Embeds.errorEmbed({
						title: 'Limite par mise atteinte',
						message:
							`Tu as déjà misé **${currentTotalOnType}** ${emojis.rubies} sur ce choix. ` +
							`Il ne te reste que **${remainingOnType}** ${emojis.rubies} de plafond pour cet emplacement de mise.`
					})
				],
				flags: MessageFlags.Ephemeral
			});
		}

		// 5. Vérification du montant minimum
		if (amount < ROULETTE_CONFIG.MIN_BET) {
			return interaction.reply({
				embeds: [Embeds.errorEmbed({ message: `La mise minimale est de **${ROULETTE_CONFIG.MIN_BET}** ${emojis.rubies}.` })],
				flags: MessageFlags.Ephemeral
			});
		}

		// 6. Vérification du solde du joueur
		const check = await container.economyService.view(userId);
		if (!check.success || check.data.rubies < amount) {
			return interaction.reply({
				embeds: [Embeds.errorEmbed({ message: "Tu n'as pas assez de rubis pour cette mise !" })],
				flags: MessageFlags.Ephemeral
			});
		}

		// 7. Débit de la mise
		const transaction = await container.casinoService.transaction(userId, amount, 'remove');
		if (!transaction.success) {
			return interaction.reply({
				embeds: [Embeds.errorEmbed({ message: 'Erreur lors du débit de ta mise.' })],
				flags: MessageFlags.Ephemeral
			});
		}

		// 8. Enregistrement de la mise
		const betResult = await container.rouletteService.addBet(channelId!, userId, amount, finalBetType);

		if (!betResult) {
			await container.casinoService.transaction(userId, amount, 'add');
			return interaction.reply({
				embeds: [Embeds.errorEmbed({ title: 'Trop tard', message: 'Les mises sont fermées.' })],
				flags: MessageFlags.Ephemeral
			});
		}

		// 9. Confirmation finale
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
