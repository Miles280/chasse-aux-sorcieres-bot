import { ApiClient } from './apiClient.service';
import { Currency } from '../enums/Currency';
import { Transaction } from '../models/Transaction.interface';
import { GuildMember } from 'discord.js';
import * as Embeds from '../utils/embeds';
import * as Components from '../utils/components';

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

export interface TransactionHistory {
	transactions: Transaction[];
	page: number;
	total: number;
	pages: number;
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

	async getTransactions(discordId: string, page = 1, types: string[] = []): Promise<TransactionHistory> {
		try {
			const queryParams = new URLSearchParams({
				page: String(page),
				types: types.join(',')
			});
			const response = await this.api.get<TransactionHistory>(`/economy/transactions/${discordId}?${queryParams.toString()}`);

			return response;
		} catch (err: any) {
			console.error('[EconomyService] error in getTransactions method :', err);
			return {
				transactions: [],
				page,
				total: 0,
				pages: 0,
				error: 'Erreur lors de la récupération des transactions.'
			};
		}
	}

	public async buildHistoryMessage(member: GuildMember, discordId: string, page = 1, types: string[] = []) {
		const data = await this.getTransactions(discordId, page, types);

		if (data.error) {
			return {
				embeds: [Embeds.errorEmbed({ message: data.error })],
				components: []
			};
		}

		return {
			embeds: [Embeds.buildHistoryEmbed(member, data)],
			components: [Components.buildHistoryButtons(discordId, page, data.pages, types), Components.buildHistorySelect(discordId, page)]
		};
	}
}
