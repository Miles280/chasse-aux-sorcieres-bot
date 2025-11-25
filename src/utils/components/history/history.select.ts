import { ActionRowBuilder, StringSelectMenuBuilder } from 'discord.js';
import { TransactionType } from '../../enums/TransactionType';

export function buildHistorySelect(discordId: string, page: number) {
	const labels: Record<TransactionType, string> = {
		[TransactionType.GAIN]: 'Gain',
		[TransactionType.LOSE]: 'Perte',
		[TransactionType.PURCHASE]: 'Achat',
		[TransactionType.DONATION]: 'Donation',
		[TransactionType.RECEIVE]: 'Reçu',
		[TransactionType.CONVERSION]: 'Conversion',
		[TransactionType.ADMIN]: 'Ajustement',
		[TransactionType.SET]: 'Solde défini'
	};

	return new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
		new StringSelectMenuBuilder()
			.setCustomId(`history_filter_${discordId}_${page}`)
			.setPlaceholder('Filtrer par type...')
			.setMinValues(0)
			.setMaxValues(5)
			.addOptions(
				[{ label: 'Tous les types', value: 'ALL' }].concat(
					Object.values(TransactionType).map((type) => ({
						label: labels[type as TransactionType] || type,
						value: type.toUpperCase()
					}))
				)
			)
	);
}
