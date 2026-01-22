import { GuildMember } from 'discord.js';
import { TransactionHistory } from '../models/Economy.interface';
import * as Embeds from '../utils/embeds';
import * as Components from '../utils/components';

export class HistoryMessageBuilder {
	public static build(member: GuildMember, discordId: string, history: TransactionHistory, page = 1, types: string[] = []) {
		return {
			embeds: [Embeds.buildHistoryEmbed(member, history, types)],
			components: [
				Components.buildHistoryButtons(discordId, page, history.pagination.totalPages, types),
				Components.buildHistorySelect(discordId, page)
			]
		};
	}

	public static disableComponents(messageOptions: any) {
		if (!messageOptions.components) return [];

		// On parcourt les lignes de composants et on désactive chaque bouton/select
		return messageOptions.components.map((row: any) => {
			// row.components contient les boutons ou select menus
			const newComponents = row.components.map((component: any) => {
				// On utilise toJSON() pour cloner et on force disabled à true
				return component.setDisabled(true);
			});
			row.setComponents(newComponents);
			return row;
		});
	}
}
