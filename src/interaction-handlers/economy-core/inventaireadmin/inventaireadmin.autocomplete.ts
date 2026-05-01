import { ApplyOptions } from '@sapphire/decorators';
import { InteractionHandler, InteractionHandlerTypes, container } from '@sapphire/framework';
import type { AutocompleteInteraction } from 'discord.js';
import { Item } from '../../../models/Shop.interface';

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

		if (sub === 'add') {
			const response = await container.shopService.getAllArticles();
			if (!response.success) return this.none();

			// 1. Filtrer uniquement les items
			// 2. Appliquer la recherche utilisateur
			// 3. Limiter à 25 résultats (limite Discord)
			const choices = response.data
				.filter((i: Item) => i.type === 'item')
				.filter((i: Item) => i.name.toLowerCase().includes(search))
				.slice(0, 25)
				.map((i: Item) => ({
					name: i.name,
					value: i.id.toString()
				}));

			return this.some(choices);
		}

		if (sub === 'remove') {
			const targetOption = interaction.options.get('membre');
			if (!targetOption) return this.none();

			const targetId = targetOption.value as string;

			const response = await container.inventoryService.getUserInventory(targetId);
			if (!response.success) return this.none();

			// 1. Récupération de la liste d'items dans l'inventaire
			const inventoryItems = response.data.items;

			// 2. Vérification de sécurité
			if (!Array.isArray(inventoryItems)) return this.none();

			// 3. Filtrage + limitation Discord
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
