import { Currency } from '../enums/Currency';
import { TransactionType } from '../enums/TransactionType';
import { PaginationData } from './ApiResponse.interface';

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
	pagination: PaginationData;
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

export interface ConversionData {
	roleId: string;
	rate: number;
	converted: number;
	rubiesEarned: number;
	previous: {
		gems: number;
		rubies: number;
	};
	current: {
		gems: number;
		rubies: number;
	};
}

export interface ConversionRates {
	currentRoleId: string | null;
	currentRate: number;
	rates: {
		roleId: string;
		rate: number;
		isCurrent: boolean;
	}[];
}

export interface LeaderboardUser {
	discordId: string;
	gems: number;
	rubies: number;
}

export interface LeaderboardData {
	users: LeaderboardUser[];
	pagination: PaginationData;
}

export interface DailyReward {
	reward: number;
	previous_balance: number;
	current_balance: number;
	details: {
		roll_result: {
			type: 'critical_failure' | 'common' | 'jackpot';
		};
		multipliers: {
			role_rate: number;
			streak_days: number;
			streak_rate: number;
		};
	};
}
