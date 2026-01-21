import { Currency } from '../enums/Currency';
import { TransactionType } from '../enums/TransactionType';

export interface UserBalance {
	gems: number;
	rubies: number;
	transactions?: Transaction[];
}

export interface BalanceUpdate {
	previous: UserBalance;
	current: UserBalance;
}

export interface Transaction {
	id: number;
	type: TransactionType;
	currency: Currency;
	amount: number;
	description?: string | null;
	relatedUserId?: string | null;
	createdAt: number; // timestamp Unix (secondes)
}

export interface TransactionHistory {
	items: Transaction[];
	pagination: {
		currentPage: number;
		totalPages: number;
		totalItems: number;
	};
}

export interface CasinoUpdate {
	previous: number;
	current: number;
}

export type EconomyAction = 'add' | 'remove' | 'set' | 'give';

export type EconomyEmbedOptions = {
	targetId: string;
	action: EconomyAction;
	currency: 'gems' | 'rubies';
	amount: number;
	update: BalanceUpdate;
};
