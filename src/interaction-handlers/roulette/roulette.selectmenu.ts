import { ApplyOptions } from '@sapphire/decorators';
import { InteractionHandler, InteractionHandlerTypes } from '@sapphire/framework';
import { StringSelectMenuInteraction, ModalBuilder, TextInputBuilder, TextInputStyle, LabelBuilder } from 'discord.js';
import { ROULETTE_CONFIG } from '../../utils/constants';

@ApplyOptions<InteractionHandler.Options>({
	interactionHandlerType: InteractionHandlerTypes.SelectMenu
})
export class RouletteSelectMenuHandler extends InteractionHandler {
	public override parse(interaction: StringSelectMenuInteraction) {
		if (interaction.customId !== 'roulette:select:bet') return this.none();
		return this.some();
	}

	public async run(interaction: StringSelectMenuInteraction) {
		const selectedBet = interaction.values[0];

		// 1. Création de la modal
		const modal = new ModalBuilder().setCustomId(`roulette:modal:${selectedBet}`).setTitle('🎰 Placer une mise');

		// 2. Champ pour entrer le montant de la mise
		const amountInput = new TextInputBuilder()
			.setCustomId('amount')
			.setPlaceholder(`Min: ${ROULETTE_CONFIG.MIN_BET} & Max: ${ROULETTE_CONFIG.MAX_BET}`)
			.setStyle(TextInputStyle.Short)
			.setRequired(true)
			.setMinLength(1)
			.setMaxLength(3);

		const amountLabel = new LabelBuilder().setLabel('Combien voulez-vous miser ?').setTextInputComponent(amountInput);

		// 3. Si la mise est sur un numéro précis, on ajoute un champ supplémentaire
		if (selectedBet === 'number') {
			const numberInput = new TextInputBuilder()
				.setCustomId('number_choice')
				.setPlaceholder('De 0 à 36')
				.setStyle(TextInputStyle.Short)
				.setRequired(true)
				.setMinLength(1)
				.setMaxLength(2);

			const numberLabel = new LabelBuilder().setLabel('Sur quel numéro précis voulez-vous miser ?').setTextInputComponent(numberInput);

			// Ajoute les deux champs au modal
			modal.addLabelComponents(numberLabel, amountLabel);
		} else {
			// Sinon uniquement le champ du montant
			modal.addLabelComponents(amountLabel);
		}

		// 4. Affiche la modal au joueur
		await interaction.showModal(modal);
	}
}
