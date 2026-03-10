import { ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder, GuildMember, AnyComponentBuilder } from 'discord.js';
import { TransactionHistory } from '../models/Economy.interface';
import { TransactionType } from '../enums/TransactionType';
import { TRANSACTION_LABELS } from '../utils/transactionLabels';
import * as Embeds from '../utils/embeds';

export class HistoryMessageBuilder {
	/**
	 * Construit le message complet
	 */
	public static build(member: GuildMember, discordId: string, history: TransactionHistory, page = 1, types: string[] = []) {
		return {
			// On appelle toujours l'embed externe
			embeds: [Embeds.buildHistoryEmbed(member, history, types)],
			// Mais on génère les composants ici en interne
			components: [this.buildButtons(discordId, page, history.pagination.totalPages, types), this.buildSelect(discordId, page)]
		};
	}

	/**
	 * Logique des boutons de pagination
	 */
	private static buildButtons(discordId: string, page: number, maxPage: number, types: string[]) {
		return new ActionRowBuilder<ButtonBuilder>().addComponents(
			new ButtonBuilder()
				.setCustomId(`history:button:prev:${discordId}:${page}:${types.join(',')}`)
				.setLabel('◀️ Précédent')
				.setStyle(ButtonStyle.Secondary)
				.setDisabled(page <= 1),
			new ButtonBuilder()
				.setCustomId(`history:button:next:${discordId}:${page}:${types.join(',')}`)
				.setLabel('Suivant ▶️')
				.setStyle(ButtonStyle.Secondary)
				.setDisabled(page >= maxPage)
		);
	}

	/**
	 * Logique du menu de filtrage
	 */
	private static buildSelect(discordId: string, page: number) {
		return new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
			new StringSelectMenuBuilder()
				.setCustomId(`history:filter:${discordId}:${page}`)
				.setPlaceholder('Filtrer par type...')
				.setMinValues(0)
				.setMaxValues(5)
				.addOptions(
					[{ label: 'Tous les types', value: 'ALL' }].concat(
						Object.values(TransactionType).map((type) => ({
							label: TRANSACTION_LABELS[type],
							value: type
						}))
					)
				)
		);
	}

	/**
	 * Désactivation des composants
	 */
	public static disableComponents(messageOptions: any) {
		if (!messageOptions.components) return [];

		return messageOptions.components.map((row: ActionRowBuilder<AnyComponentBuilder>) => {
			row.components.forEach((component: any) => {
				if (typeof component.setDisabled === 'function') {
					component.setDisabled(true);
				}
			});
			return row;
		});
	}
}
