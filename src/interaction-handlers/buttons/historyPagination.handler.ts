import { ApplyOptions } from '@sapphire/decorators';
import { InteractionHandler, InteractionHandlerTypes, container } from '@sapphire/framework';
import { ButtonInteraction, MessageFlags } from 'discord.js';
import { HistoryMessageBuilder } from '../../builders/HistoryMessage.builder';
import * as Embeds from '../../utils/embeds';

@ApplyOptions<InteractionHandler.Options>({
	interactionHandlerType: InteractionHandlerTypes.Button
})
export class HistoryPaginationHandler extends InteractionHandler {
	public override parse(interaction: ButtonInteraction) {
		return interaction.customId.startsWith('history_') ? this.some() : this.none();
	}

	public override async run(interaction: ButtonInteraction) {
		// 1. Extraction des données du customId
		const [, direction, discordId, currentPage, typesEncoded] = interaction.customId.split('_');
		const types = decodeURIComponent(typesEncoded || '')
			.split(',')
			.filter(Boolean);

		let page = Number(currentPage);
		page = direction === 'next' ? page + 1 : page - 1;

		// 2. Vérification du membre
		const member = await container.discordService.fetchMemberOrReply(interaction.guild, discordId, interaction);
		if (!member) return;

		// 3. Appel au SERVICE pour récupérer les nouvelles données de la page
		const response = await container.economyService.getHistory(discordId, page, types);

		// 4. Gestion d'erreur (AVANT le builder)
		if (!response.success) {
			return interaction.reply({
				embeds: [Embeds.errorEmbed({ message: response.error })],
				flags: [MessageFlags.Ephemeral]
			});
		}

		// 5. Appel au BUILDER avec les données validées
		const messageOptions = HistoryMessageBuilder.build(member, discordId, response.data, page, types);

		// 6. Mise à jour du message
		return interaction.update(messageOptions);
	}
}
