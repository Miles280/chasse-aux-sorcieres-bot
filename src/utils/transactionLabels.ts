import { TransactionType } from '../enums/TransactionType';

export const TRANSACTION_LABELS: Record<string, string> = {
	[TransactionType.CASINO]: 'Casino',
	[TransactionType.CONVERSION]: 'Conversion',
	[TransactionType.GAIN]: 'Gain',
	[TransactionType.LOSE]: 'Perte',
	[TransactionType.DONATION]: 'Donation',
	[TransactionType.RECEIVE]: 'Reçu',
	[TransactionType.PURCHASE]: 'Achat',
	[TransactionType.SELL]: 'Vente',
	[TransactionType.ADD]: 'Ajout',
	[TransactionType.REMOVE]: 'Retrait',
	[TransactionType.SET]: 'Solde défini'
};

/**
 * Retourne le label lisible d’un type de transaction
 */
export function formatTransactionLabel(type: string): string {
	return TRANSACTION_LABELS[type] ?? type;
}
