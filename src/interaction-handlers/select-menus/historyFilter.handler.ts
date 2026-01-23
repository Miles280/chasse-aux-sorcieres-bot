import { ApplyOptions } from '@sapphire/decorators';
import { InteractionHandler, InteractionHandlerTypes, container } from '@sapphire/framework';
import { MessageFlags, StringSelectMenuInteraction } from 'discord.js';
import * as Embeds from '../../utils/embeds';
import { HistoryMessageBuilder } from '../../builders/HistoryMessage.builder';

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
		// Extraction des types sélectionnés (on filtre "ALL")
		const types = interaction.values.includes('ALL') ? [] : interaction.values;

		// 1. Vérification du membre
		const member = await container.discordService.fetchMemberOrReply(interaction.guild, discordId, interaction);
		if (!member) return;

		// 2. Appel au SERVICE (On reset souvent à la page 1 quand on change de filtre)
		const response = await container.economyService.getTransactions(discordId, 1, types);

		// 3. Gestion d'erreur avec return
		if (!response.success) {
			return interaction.reply({
				embeds: [Embeds.errorEmbed({ message: response.error })],
				flags: [MessageFlags.Ephemeral]
			});
		}

		// 4. Appel au BUILDER avec les données (page 1 forcée ici)
		const messageOptions = HistoryMessageBuilder.build(member, discordId, response.data, 1, types);

		// 5. Mise à jour du message
		return interaction.update(messageOptions);
	}
}
