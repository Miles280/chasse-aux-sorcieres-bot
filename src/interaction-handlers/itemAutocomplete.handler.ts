import { ApplyOptions } from '@sapphire/decorators';
import { InteractionHandler, InteractionHandlerTypes } from '@sapphire/framework';
import type { AutocompleteInteraction } from 'discord.js';
import { container } from '@sapphire/framework';

@ApplyOptions<InteractionHandler.Options>({
	interactionHandlerType: InteractionHandlerTypes.Autocomplete
})
export class ItemAutocompleteHandler extends InteractionHandler {
	public override async parse(interaction: AutocompleteInteraction) {
		if (interaction.commandName !== 'item') {
			return this.none();
		}

		let sub: string;
		try {
			sub = interaction.options.getSubcommand();
		} catch {
			return this.none();
		}

		const focused = interaction.options.getFocused(true);
		if (focused.name !== 'item') {
			return this.none();
		}

		let choices: { name: string; value: string }[] = [];

		// ----- AUTOCOMPLETE POUR /item info -----
		if (sub === 'info') {
			const response = await container.shopService.getAllArticles();
			if (response.error) return this.none();

			choices = response.items
				.filter((i) => i.name.toLowerCase().includes(focused.value.toLowerCase()))
				.slice(0, 25)
				.map((i) => ({ name: i.name, value: i.id.toString() }));
		}

		// ----- AUTOCOMPLETE POUR /item sell -----
		if (sub === 'sell') {
			const userId = interaction.user.id;

			const inventory = await container.inventoryService.getInventory(userId);
			if (inventory.error) return this.none();

			choices = inventory.items
				.filter((i) => i.item.name.toLowerCase().includes(focused.value.toLowerCase()))
				.slice(0, 25)
				.map((i) => ({ name: i.item.name, value: i.item.id.toString() }));
		}

		return this.some(choices);
	}

	public override async run(interaction: AutocompleteInteraction, result: { name: string; value: string }[]) {
		return interaction.respond(result);
	}
}
