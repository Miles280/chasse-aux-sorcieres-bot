import { ApiClient } from './ApiClient';
import { Currency } from '../enums/Currency';
import { Transaction } from '../models/Transaction';

export interface UserBalance {
	gems: number;
	rubies: number;
	transactions?: Transaction[];
}

export interface TransactionResponse {
	success: boolean;
	currency?: Currency;
	old?: number;
	balance?: UserBalance;
	error?: string;
}

export class EconomyService {
	constructor(private api: ApiClient) {}

	async view(discordId: string): Promise<TransactionResponse> {
		try {
			const balance = await this.api.get<UserBalance>(`/economy/${discordId}`);
			return { success: true, balance };
		} catch (err) {
			console.error(`[EconomyService] error in view method :`, err);
			return { success: false, error: 'Une erreur est survenue lors de la récupération du solde.' };
		}
	}

	async give(senderId: string, receiverId: string, currency: Currency, amount: number): Promise<TransactionResponse> {
		try {
			return await this.api.post<TransactionResponse>('/economy/give', { senderId, receiverId, currency, amount });
		} catch (err: any) {
			console.error('[EconomyService] error in give method :', err);
			return { success: false, error: err.response.data.error || 'Une erreur est survenue lors de la transaction.' };
		}
	}

	async add(discordId: string, currency: Currency, amount: number): Promise<TransactionResponse> {
		try {
			return await this.api.post<TransactionResponse>('/economy/add', { discordId, currency, amount });
		} catch (err: any) {
			console.error('[EconomyService] error in add method :', err);
			return { success: false, error: err.response.data.error || 'Une erreur est survenue lors de la transaction.' };
		}
	}

	async remove(discordId: string, currency: Currency, amount: number): Promise<TransactionResponse> {
		try {
			return await this.api.post<TransactionResponse>('/economy/remove', { discordId, currency, amount });
		} catch (err: any) {
			console.error('[EconomyService] error in remove method :', err);
			return { success: false, error: err.response.data.error || 'Une erreur est survenue lors de la transaction.' };
		}
	}

	async set(discordId: string, currency: Currency, amount: number): Promise<TransactionResponse> {
		try {
			return await this.api.post<TransactionResponse>('/economy/set', { discordId, currency, amount });
		} catch (err: any) {
			console.error('[EconomyService] error in set method :', err);
			return { success: false, error: err.response.data.error || 'Une erreur est survenue lors de la transaction.' };
		}
	}
}
