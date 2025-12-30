import { ActionRowBuilder, StringSelectMenuBuilder } from 'discord.js';
import { TransactionType } from '../../../enums/TransactionType';
import { TRANSACTION_LABELS } from '../../../utils/transactionLabels';

export function buildHistorySelect(discordId: string, page: number) {
	return new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
		new StringSelectMenuBuilder()
			.setCustomId(`history_filter_${discordId}_${page}`)
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
