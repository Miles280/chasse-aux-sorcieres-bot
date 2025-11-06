import { Transaction } from '../models/Transaction';
import { emojis } from './emojis';
import { TransactionType } from '../enums/TransactionType';

export function formatTransactions(transactions: Transaction[]): string {
	if (!transactions.length) return 'Aucune transaction récente.';

	return transactions
		.map((tx) => {
			const other = tx.relatedUserId ? `<@${tx.relatedUserId}>` : '';
			const date = tx.createdAt ? `<t:${tx.createdAt}:R>` : ''; // ex: "il y a 5 min"
			const currencyEmoji = tx.currency === 'gems' ? emojis.gems : emojis.rubies;

			let description = '';

			switch (tx.type) {
				case TransactionType.GAIN:
					description = `Vous avez gagné **+${tx.amount} ${currencyEmoji}**.`;
					break;
				case TransactionType.LOSE:
					description = `Vous avez perdu **-${tx.amount} ${currencyEmoji}**...`;
					break;
				case TransactionType.PURCHASE:
					description = `Achat de « ${tx.description} » pour **-${tx.amount} ${currencyEmoji}**.`;
					break;
				case TransactionType.DONATION:
					description = `Vous avez offert **-${tx.amount} ${currencyEmoji}** à ${other}.`;
					break;
				case TransactionType.RECEIPT:
					description = `Vous avez reçu **+${tx.amount} ${currencyEmoji}** de la part de ${other}.`;
					break;
				case TransactionType.CONVERSION:
					description =
						tx.amount > 0
							? `Vous avez reçu **+${tx.amount} ${currencyEmoji}** lors d'une conversion.`
							: `Vous avez converti **-${Math.abs(tx.amount)} ${currencyEmoji}**.`;
					break;
				case TransactionType.ADMIN:
					description =
						tx.amount > 0
							? `Ajustement administratif de **+${tx.amount} ${currencyEmoji}**.`
							: `Ajustement administratif de **-${Math.abs(tx.amount)} ${currencyEmoji}**.`;
					break;
				default:
					description = `❔ Transaction inconnue : **${tx.amount} ${currencyEmoji}**.`;
			}

			return `> ${date} : ${description}`;
		})
		.join('\n');
}
