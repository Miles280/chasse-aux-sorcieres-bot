import { emojis } from './emojis';
import { TransactionType } from '../enums/TransactionType';
import { Transaction } from '../models/Economy.interface';

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
					description = `${tx.description} : Vous avez gagné **+${tx.amount} ${currencyEmoji}**.`;
					break;
				case TransactionType.LOSE:
					description = `Vous avez perdu **-${tx.amount} ${currencyEmoji}**...`;
					break;
				case TransactionType.DONATION:
					description = `Vous avez offert **-${tx.amount} ${currencyEmoji}** à ${other}.`;
					break;
				case TransactionType.RECEIVE:
					description = `Vous avez reçu **+${tx.amount} ${currencyEmoji}** de la part de ${other}.`;
					break;
				case TransactionType.ADD:
					description = `Vous avez reçu **+${tx.amount} ${currencyEmoji}** suite à un ajustement.`;
					break;
				case TransactionType.REMOVE:
					description = `Vous avez perdu **-${tx.amount} ${currencyEmoji}** suite à un ajustement.`;
					break;
				case TransactionType.PURCHASE:
					description = `Achat de « __${tx.description}__ » pour **-${tx.amount} ${currencyEmoji}**${other ? ` à ${other}` : ''}.`;
					break;
				case TransactionType.SELL:
					description = `Vente de « __${tx.description}__ » pour **+${tx.amount} ${currencyEmoji}** à ${other}.`;
					break;
				case TransactionType.SET:
					description = `Solde défini à **${tx.amount} ${currencyEmoji}**.`;
					break;
				case TransactionType.CONVERT:
					description =
						tx.amount > 0
							? `Vous avez reçu **+${tx.amount} ${currencyEmoji}** lors d'une conversion.`
							: `Vous avez converti **-${Math.abs(tx.amount)} ${currencyEmoji}**.`;
					break;
				case TransactionType.CASINO:
					description =
						tx.amount >= 0
							? `Vous avez gagné **+${tx.amount} ${currencyEmoji}** au casino.`
							: `Vous avez perdu **${tx.amount} ${currencyEmoji}** au casino...`;
					break;
				default:
					description = `❔ Transaction inconnue : **${tx.amount} ${currencyEmoji}**.`;
			}

			return `> ${date} : ${description}`;
		})
		.join('\n');
}
