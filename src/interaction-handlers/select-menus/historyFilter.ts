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

		// Vérification que le membre est sur le serveur (pour pouvoir afficher l'utilisateur dans l'embed)
		const member = await container.discordService.fetchMemberOrReply(interaction.guild, discordId, interaction);
		if (!member) return;

		// Générer le nouveau message avec le filtre
		const messageData = await container.economyService.buildHistoryMessage(member, discordId, 1, types);
		await interaction.update({ ...messageData });
	}
}
