import { ApplyOptions } from '@sapphire/decorators';
import { InteractionHandler, InteractionHandlerTypes, container } from '@sapphire/framework';
import { ButtonInteraction, GuildMember, MessageFlags } from 'discord.js';
import { Currency } from '../../../enums/Currency';
import { LeaderboardMessageBuilder } from '../../../builders/economy-core/LeaderboardMessage.builder';
import * as Embeds from '../../../utils/embeds';

@ApplyOptions<InteractionHandler.Options>({
	interactionHandlerType: InteractionHandlerTypes.Button
})
export class LeaderboardButtonHandler extends InteractionHandler {
	public override parse(interaction: ButtonInteraction) {
		return interaction.customId.startsWith('leaderboard:') ? this.some() : this.none();
	}

	public override async run(interaction: ButtonInteraction) {
		// Exemples de customId :
		// - leaderboard:page:next:rubies:1
		// - leaderboard:switch:gems:1
		const [, action, targetOrDirection, currencyRaw, currentPage] = interaction.customId.split(':');

		let currency = currencyRaw as Currency;
		let page = Number(currentPage);

		// -- LOGIQUE CHANGEMENT DE MONNAIE --
		if (action === 'switch') {
			const member = interaction.member as GuildMember;

			// Vérification Admin via ton DiscordService
			if (!container.discordService.hasStaffRole(member)) {
				return interaction.reply({
					embeds: [Embeds.errorEmbed({ message: 'Seul le staff peut modifier la monnaie affichée dans le classement.' })],
					flags: [MessageFlags.Ephemeral]
				});
			}

			currency = targetOrDirection as Currency; // targetOrDirection contient la monnaie cible ici
			page = 1; // On reset à la page 1 lors d'un changement de monnaie
		}
		// -- LOGIQUE PAGINATION --
		else if (action === 'page') {
			if (targetOrDirection === 'next') page++;
			if (targetOrDirection === 'prev') page--;
		}

		// Récupération des données API
		const response = await container.economyService.getLeaderboard(currency, page);

		if (!response.success) {
			return interaction.reply({
				embeds: [Embeds.errorEmbed({ message: response.error })],
				flags: [MessageFlags.Ephemeral]
			});
		}

		const messageOptions = LeaderboardMessageBuilder.build(currency, page, response.data);

		return interaction.update(messageOptions);
	}
}
