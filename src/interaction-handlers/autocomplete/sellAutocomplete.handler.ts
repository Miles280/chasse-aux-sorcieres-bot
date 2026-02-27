import { ApplyOptions } from '@sapphire/decorators';
import { InteractionHandler, InteractionHandlerTypes, container } from '@sapphire/framework';
import type { AutocompleteInteraction } from 'discord.js';

@ApplyOptions<InteractionHandler.Options>({
	interactionHandlerType: InteractionHandlerTypes.Autocomplete
})
export class ItemAutocompleteHandler extends InteractionHandler {
	public override async parse(interaction: AutocompleteInteraction) {
		if (interaction.commandName !== 'sell') return this.none();

		const focused = interaction.options.getFocused(true);

		if (focused.name !== 'item') return this.none();

		const searchTerm = focused.value.toLowerCase();

		const response = await container.shopService.getAllArticles();
		if (!response.success) return this.none();

		const choices = response.data
			.filter((i) => i.name.toLowerCase().includes(searchTerm))
			.slice(0, 25)
			.map((i) => ({ name: i.name, value: i.id.toString() }));

		return this.some(choices);
	}

	public override async run(interaction: AutocompleteInteraction, result: { name: string; value: string }[]) {
		return interaction.respond(result);
	}
}
