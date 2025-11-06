import { TransactionType } from '../enums/TransactionType';

export interface Transaction {
	id: number;
	type: TransactionType;
	currency: 'gems' | 'rubies';
	amount: number;
	description?: string | null;
	relatedUserId?: string | null;
	createdAt: number; // timestamp Unix (secondes)
}
