import { ApplyOptions } from '@sapphire/decorators';
import { InteractionHandler, InteractionHandlerTypes, container } from '@sapphire/framework';
import type { AutocompleteInteraction } from 'discord.js';

@ApplyOptions<InteractionHandler.Options>({
	interactionHandlerType: InteractionHandlerTypes.Autocomplete
})
export class ItemAutocompleteHandler extends InteractionHandler {
	public override async parse(interaction: AutocompleteInteraction) {
		if (interaction.commandName !== 'item') return this.none();

		const sub = interaction.options.getSubcommand(false);
		const focused = interaction.options.getFocused(true);

		if (focused.name !== 'item' || !sub) return this.none();

		const searchTerm = focused.value.toLowerCase();
		let choices: { name: string; value: string }[] = [];

		// ----- AUTOCOMPLETE POUR /item info (Tous les items du shop) -----
		if (sub === 'info') {
			const response = await container.shopService.getAllArticles(); // Ajuste selon le nom de ta méthode

			if (!response.success) return this.none();

			choices = response.data
				.filter((i) => i.name.toLowerCase().includes(searchTerm))
				.slice(0, 25)
				.map((i) => ({ name: i.name, value: i.id.toString() }));
		}

		// ----- AUTOCOMPLETE POUR /item sell (Seulement les items du joueur) -----
		if (sub === 'sell') {
			const userId = interaction.user.id;
			const response = await container.inventoryService.getUserInventory(userId);

			if (!response.success) return this.none();

			choices = response.data.items
				.filter((entry) => entry.item.name.toLowerCase().includes(searchTerm))
				.slice(0, 25)
				.map((entry) => ({
					name: `${entry.item.name} (x${entry.quantity})`,
					value: entry.item.id.toString()
				}));
		}

		return this.some(choices);
	}

	public override async run(interaction: AutocompleteInteraction, result: { name: string; value: string }[]) {
		return interaction.respond(result);
	}
}
