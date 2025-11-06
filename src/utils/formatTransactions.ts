import { Transaction } from '../models/Transaction';
import { emojis } from './emojis';

export function formatTransactions(transactions: Transaction[]): string {
	return transactions
		.map((tx) => {
			const other = tx.relatedUserId ? `<@${tx.relatedUserId}>` : '';
			const date = tx.createdAt ? `<t:${tx.createdAt}:R>` : ''; // Discord timestamp relatif
			const sign = tx.type === 'gain' || tx.type === 'receipt' ? '+' : '-';
			const currencyEmoji = tx.currency === 'gems' ? `${emojis.gems}` : `${emojis.rubies}`;

			return `> ${date} : ${sign}${tx.amount} ${currencyEmoji} ${other} (${tx.type}) `;
		})
		.join('\n');
}
