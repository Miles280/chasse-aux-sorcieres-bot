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
		const [, action, targetOrDirection, currencyRaw, currentPage] = interaction.customId.split(':');

		let currency = currencyRaw as Currency;
		let page = Number(currentPage);

		// -- LOGIQUE CHANGEMENT DE MONNAIE --
		if (action === 'switch') {
			const member = interaction.member as GuildMember;

			if (!container.discordService.hasStaffRole(member)) {
				return interaction.reply({
					embeds: [Embeds.errorEmbed({ message: 'Seul le staff peut modifier la monnaie affichée dans le classement.' })],
					flags: [MessageFlags.Ephemeral]
				});
			}

			currency = targetOrDirection as Currency;
			page = 1;
		}
		// -- LOGIQUE PAGINATION --
		else if (action === 'page') {
			if (targetOrDirection === 'next') page++;
			if (targetOrDirection === 'prev') page--;
		}

		await interaction.deferUpdate();

		if (!interaction.guild) return;

		// Récupération des IDs des membres du serveur
		if (interaction.guild.members.cache.size === 0) {
			await interaction.guild.members.fetch();
		}
		const memberIds = Array.from(interaction.guild.members.cache.keys());

		// Récupération des données API filtrées
		const response = await container.economyService.getLeaderboard(currency, page, memberIds);

		if (!response.success) {
			return interaction.followUp({
				embeds: [Embeds.errorEmbed({ message: response.error ?? 'Erreur de chargement du classement.' })],
				flags: [MessageFlags.Ephemeral]
			});
		}

		// Construction et mise à jour du message
		const messageOptions = LeaderboardMessageBuilder.build(currency, page, response.data);

		return interaction.editReply(messageOptions);
	}
}
