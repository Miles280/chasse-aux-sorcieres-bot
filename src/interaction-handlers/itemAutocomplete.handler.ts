import { ApplyOptions } from '@sapphire/decorators';
import { InteractionHandler, InteractionHandlerTypes } from '@sapphire/framework';
import type { AutocompleteInteraction } from 'discord.js';
import { container } from '@sapphire/framework';

@ApplyOptions<InteractionHandler.Options>({
	interactionHandlerType: InteractionHandlerTypes.Autocomplete
})
export class ItemAutocompleteHandler extends InteractionHandler {
	public override async parse(interaction: AutocompleteInteraction) {
		// Vérifie que c’est la bonne commande + bonne option
		if (interaction.commandName !== 'item' /* ou le nom de ta commande */) {
			return this.none();
		}
		const focused = interaction.options.getFocused(true);
		if (focused.name !== 'item') {
			return this.none();
		}

		// On récupère l'inventaire via ton service
		const response = await container.shopService.getInventory(interaction.user.id);
		if (response.error) return this.none();

		const filtered = response.items
			.filter((entry) => entry.item.name.toLowerCase().includes((focused.value as string).toLowerCase()))
			.map((entry) => ({ name: entry.item.name, value: String(entry.item.id) }))
			.slice(0, 25);

		return this.some(filtered);
	}

	public override async run(interaction: AutocompleteInteraction, result: { name: string; value: string }[]) {
		return interaction.respond(result);
	}
}
