import { Currency } from '../enums/Currency';
import { Transaction } from './Transaction.interface';

export interface UserBalance {
	gems: number;
	rubies: number;
	transactions?: Transaction[];
}

export interface BalanceUpdate {
	previous: UserBalance;
	current: UserBalance;
}

export type EconomyAction = 'add' | 'remove' | 'set' | 'give';

export type EconomyEmbedOptions = {
	targetId: string;
	action: EconomyAction;
	currency: 'gems' | 'rubies';
	amount: number;
	update: BalanceUpdate;
};

export interface CasinoResponse {
	old?: number;
	rubies?: number;
	error?: string;
}

export interface TransactionResponse {
	currency?: Currency;
	old?: number;
	balance?: UserBalance;
	error?: string;
}

export interface TransactionHistory {
	transactions: Transaction[];
	page: number;
	total: number;
	pages: number;
	error?: string;
}
