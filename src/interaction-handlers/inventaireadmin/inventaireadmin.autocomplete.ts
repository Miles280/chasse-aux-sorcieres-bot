import { ApplyOptions } from '@sapphire/decorators';
import { InteractionHandler, InteractionHandlerTypes, container } from '@sapphire/framework';
import type { AutocompleteInteraction } from 'discord.js';

@ApplyOptions<InteractionHandler.Options>({
	interactionHandlerType: InteractionHandlerTypes.Autocomplete
})
export class InventoryAdminAutocomplete extends InteractionHandler {
	public override async parse(interaction: AutocompleteInteraction) {
		if (interaction.commandName !== 'inventaireadmin') return this.none();

		const sub = interaction.options.getSubcommand(false);
		const focused = interaction.options.getFocused(true);

		if (focused.name !== 'item') return this.none();

		const search = focused.value.toLowerCase();

		/*
		ADD
		*/
		if (sub === 'add') {
			const response = await container.shopService.getAllArticles();
			if (!response.success) return this.none();

			const choices = response.data
				.filter((i) => i.type === 'item')
				.filter((i) => i.name.toLowerCase().includes(search))
				.slice(0, 25)
				.map((i) => ({
					name: i.name,
					value: i.id.toString()
				}));

			return this.some(choices);
		}

		/*
		REMOVE
		*/
		if (sub === 'remove') {
			const targetOption = interaction.options.get('membre');
			if (!targetOption) return this.none();

			const targetId = targetOption.value as string;

			const response = await container.inventoryService.getUserInventory(targetId);
			if (!response.success) return this.none();

			// ICI : On accède à la liste d'items à l'intérieur de l'objet inventory
			// Remplace '.items' par le nom exact de la propriété dans ton type Inventory
			const inventoryItems = response.data.items;

			// On vérifie que c'est bien un tableau pour éviter d'autres bugs
			if (!Array.isArray(inventoryItems)) return this.none();

			const choices = inventoryItems
				.filter((i) => i.item.name.toLowerCase().includes(search))
				.slice(0, 25)
				.map((i) => ({
					name: i.item.name,
					value: i.item.id.toString()
				}));

			return this.some(choices);
		}

		return this.none();
	}

	public override async run(interaction: AutocompleteInteraction, result: any) {
		return interaction.respond(result);
	}
}
