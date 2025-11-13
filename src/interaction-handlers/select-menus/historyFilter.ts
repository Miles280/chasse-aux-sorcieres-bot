import { ApplyOptions } from '@sapphire/decorators';
import { InteractionHandler, InteractionHandlerTypes, container } from '@sapphire/framework';
import { StringSelectMenuInteraction } from 'discord.js';

@ApplyOptions<InteractionHandler.Options>({
	interactionHandlerType: InteractionHandlerTypes.SelectMenu
})
export class HistoryFilterHandler extends InteractionHandler {
	public override parse(interaction: StringSelectMenuInteraction) {
		return interaction.customId.startsWith('history_filter_') ? this.some() : this.none();
	}

	public override async run(interaction: StringSelectMenuInteraction) {
		// customId = history_filter_{discordId}_{page}
		const [, , discordId] = interaction.customId.split('_');
		const types = interaction.values.includes('ALL') ? [] : interaction.values; // si "ALL" est sélectionné, pas de filtre

		// Générer le nouveau message avec le filtre
		const messageData = await container.economyService.buildHistoryMessage(discordId, 1, types);
		await interaction.update({ ...messageData });
	}
}
