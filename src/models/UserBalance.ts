import { Transaction } from './Transaction';

export interface UserBalance {
	discordId: string;
	gems: number;
	rubies: number;
	transactions: Transaction[];
}
