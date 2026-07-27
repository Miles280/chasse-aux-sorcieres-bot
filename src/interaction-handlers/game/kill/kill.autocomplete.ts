import { ApplyOptions } from '@sapphire/decorators';
import { InteractionHandler, InteractionHandlerTypes, container } from '@sapphire/framework';
import type { AutocompleteInteraction } from 'discord.js';
import { RoleInterface } from '../../../models/game/Role.interface';

@ApplyOptions<InteractionHandler.Options>({
	interactionHandlerType: InteractionHandlerTypes.Autocomplete
})
export class KillAutocompleteHandler extends InteractionHandler {
	public override async parse(interaction: AutocompleteInteraction) {
		if (interaction.commandName !== 'kill') return this.none();

		const focused = interaction.options.getFocused(true);

		if (focused.name !== 'fake') return this.none();

		const searchTerm = focused.value.toLowerCase();

		const responseGame = await container.inGameService.getActiveGame();
		if (!responseGame.success) return this.none();

		const responseCompo = await container.inscriptionService.getCompo(responseGame.data.id);
		if (!responseCompo.success) return this.none();

		const choices = responseCompo.data.composition
			.filter((r: RoleInterface) => r.name.toLowerCase().includes(searchTerm))
			.slice(0, 25)
			.map((r: RoleInterface) => ({ name: r.name, value: r.id.toString() }));

		return this.some(choices);
	}

	public override async run(interaction: AutocompleteInteraction, result: { name: string; value: string }[]) {
		return interaction.respond(result);
	}
}
