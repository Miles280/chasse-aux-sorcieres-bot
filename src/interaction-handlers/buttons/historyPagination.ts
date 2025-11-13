import { ApplyOptions } from '@sapphire/decorators';
import { InteractionHandler, InteractionHandlerTypes, container } from '@sapphire/framework';
import { ButtonInteraction } from 'discord.js';

@ApplyOptions<InteractionHandler.Options>({
	interactionHandlerType: InteractionHandlerTypes.Button
})
export class HistoryPaginationHandler extends InteractionHandler {
	public override parse(interaction: ButtonInteraction) {
		return interaction.customId.startsWith('history_') ? this.some() : this.none();
	}

	public override async run(interaction: ButtonInteraction) {
		// Ex: history_next_123456789_2_GAIN,TRANSFER
		const [, direction, discordId, currentPage, typesEncoded] = interaction.customId.split('_');
		const types = decodeURIComponent(typesEncoded || '')
			.split(',')
			.filter(Boolean);
		let page = Number(currentPage);

		page = direction === 'next' ? page + 1 : page - 1;

		const messageData = await container.economyService.buildHistoryMessage(discordId, page, types);
		await interaction.update({ ...messageData });
	}
}
