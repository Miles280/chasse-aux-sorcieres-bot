import { Currency } from '../enums/Currency';
import { Transaction } from './Transaction.interface';

export interface CasinoResponse {
	old?: number;
	rubies?: number;
	error?: string;
}

export interface UserBalance {
	gems: number;
	rubies: number;
	transactions?: Transaction[];
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
