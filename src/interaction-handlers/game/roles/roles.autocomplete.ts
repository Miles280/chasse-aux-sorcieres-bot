import { ApplyOptions } from '@sapphire/decorators';
import { InteractionHandler, InteractionHandlerTypes, container } from '@sapphire/framework';
import type { AutocompleteInteraction } from 'discord.js';
import { RoleInterface } from '../../../models/Role.interface';

@ApplyOptions<InteractionHandler.Options>({
	interactionHandlerType: InteractionHandlerTypes.Autocomplete
})
export class ROleAutocompleteHandler extends InteractionHandler {
	public override async parse(interaction: AutocompleteInteraction) {
		if (interaction.commandName !== 'role') return this.none();

		const focused = interaction.options.getFocused(true);

		if (focused.name !== 'nom') return this.none();

		const searchTerm = focused.value.toLowerCase();

		const response = await container.rolesService.getAllRoles();
		if (!response.success) return this.none();

		const choices = response.data
			.filter((r: RoleInterface) => r.name.toLowerCase().includes(searchTerm))
			.slice(0, 25)
			.map((r: RoleInterface) => ({ name: r.name, value: r.id.toString() }));

		return this.some(choices);
	}

	public override async run(interaction: AutocompleteInteraction, result: { name: string; value: string }[]) {
		return interaction.respond(result);
	}
}
