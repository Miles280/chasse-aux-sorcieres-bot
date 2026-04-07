import { ApplyOptions } from '@sapphire/decorators';
import { InteractionHandler, InteractionHandlerTypes } from '@sapphire/framework';
import { StringSelectMenuInteraction, ModalBuilder, TextInputBuilder, TextInputStyle, LabelBuilder } from 'discord.js';
import { ROULETTE_CONFIG } from '../../../utils/constants';
import { RouletteMessageBuilder } from '../../../builders/casino/RouletteMessage.builder';

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

		// 1. Gestion du rafraîchissement du menu (pour débloquer la sélection Discord)
		if (selectedBet === 'reset') {
			const components = RouletteMessageBuilder.buildLobbyComponents();
			await interaction.update({ components });
			return; // On arrête l'exécution ici
		}

		// 2. Création de la modal principale
		const modal = new ModalBuilder().setCustomId(`roulette:modal:${selectedBet}`).setTitle('🎰 Placer une mise');

		// 3. Configuration du champ pour le montant de la mise
		const amountInput = new TextInputBuilder()
			.setCustomId('amount')
			.setPlaceholder(`Min: ${ROULETTE_CONFIG.MIN_BET} & Max: ${ROULETTE_CONFIG.MAX_BET}`)
			.setStyle(TextInputStyle.Short)
			.setRequired(true)
			.setMinLength(1)
			.setMaxLength(3);

		const amountLabel = new LabelBuilder().setLabel('Combien voulez-vous miser ?').setTextInputComponent(amountInput);

		// 4. Ajout d'un champ spécifique si la mise concerne un numéro précis
		if (selectedBet === 'number') {
			const numberInput = new TextInputBuilder()
				.setCustomId('number_choice')
				.setPlaceholder('De 0 à 36')
				.setStyle(TextInputStyle.Short)
				.setRequired(true)
				.setMinLength(1)
				.setMaxLength(2);

			const numberLabel = new LabelBuilder().setLabel('Sur quel numéro précis voulez-vous miser ?').setTextInputComponent(numberInput);

			// Ajout des deux champs (numéro + montant)
			modal.addLabelComponents(numberLabel, amountLabel);
		} else {
			// Ajout du champ montant uniquement
			modal.addLabelComponents(amountLabel);
		}

		// 5. Affichage de la modal au joueur
		await interaction.showModal(modal);
	}
}
