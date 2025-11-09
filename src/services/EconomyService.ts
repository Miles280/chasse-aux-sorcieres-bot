import { ApiClient } from './ApiClient';
import { Currency } from '../enums/Currency';
import { Transaction } from '../models/Transaction';

export interface UserBalance {
	discordId: string;
	gems: number;
	rubies: number;
	transactions?: Transaction[];
}

export interface EconomyResponse {
	success: boolean;
	balance?: UserBalance;
	error?: string;
}

export class EconomyService {
	constructor(private api: ApiClient) {}

	async view(discordId: string): Promise<EconomyResponse> {
		try {
			const balance = await this.api.get<UserBalance>(`/economy/${discordId}`);
			return { success: true, balance };
		} catch (err) {
			console.error(`[EconomyService] error in view method :`, err);
			return { success: false, error: 'Une erreur est survenue lors de la récupération du solde.' };
		}
	}

	async give(senderId: string, receiverId: string, currency: Currency, amount: number): Promise<EconomyResponse> {
		try {
			return await this.api.post<EconomyResponse>('/economy/give', { senderId, receiverId, currency, amount });
		} catch (err: any) {
			console.error('[EconomyService] error in give method :', err);
			return { success: false, error: err.response.data.error || 'Une erreur est survenue lors de la transaction.' };
		}
	}

	async add(discordId: string, currency: Currency, amount: number): Promise<EconomyResponse> {
		try {
			return await this.api.post<EconomyResponse>('/economy/add', { discordId, currency, amount });
		} catch (err: any) {
			console.error('[EconomyService] error in add method :', err);
			return { success: false, error: 'Une erreur est survenue lors de la transaction.' };
		}
	}

	async remove(discordId: string, currency: Currency, amount: number): Promise<EconomyResponse> {
		try {
			return await this.api.post<EconomyResponse>('/economy/remove', { discordId, currency, amount });
		} catch (err: any) {
			console.error('[EconomyService] error in remove method :', err);
			return { success: false, error: 'Une erreur est survenue lors de la transaction.' };
		}
	}

	async set(discordId: string, currency: Currency, amount: number): Promise<EconomyResponse> {
		try {
			return await this.api.post<EconomyResponse>('/economy/set', { discordId, currency, amount });
		} catch (err: any) {
			console.error('[EconomyService] error in set method :', err);
			return { success: false, error: 'Une erreur est survenue lors de la transaction.' };
		}
	}
}
