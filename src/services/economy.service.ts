import { ApiClient } from './apiClient.service';
import { Currency } from '../enums/Currency';
import { GuildMember } from 'discord.js';
import * as Embeds from '../utils/embeds';
import * as Components from '../utils/components';
import { BalanceUpdate, TransactionHistory, UserBalance } from '../models/Economy.interface';
import { ApiResponse } from '../models/ApiResponse.interface';

export class EconomyService {
	constructor(private api: ApiClient) {}

	async view(discordId: string): Promise<ApiResponse<UserBalance>> {
		return await this.api.get<UserBalance>(`/economy/view${discordId}`);
	}

	async give(senderId: string, receiverId: string, currency: Currency, amount: number): Promise<ApiResponse<BalanceUpdate>> {
		return await this.api.post<BalanceUpdate>('/economy/give', { senderId, receiverId, currency, amount });
	}

	async add(discordId: string, currency: Currency, amount: number): Promise<ApiResponse<BalanceUpdate>> {
		return await this.api.post<BalanceUpdate>('/economy/add', { discordId, currency, amount });
	}

	async remove(discordId: string, currency: Currency, amount: number): Promise<ApiResponse<BalanceUpdate>> {
		return await this.api.post<BalanceUpdate>('/economy/remove', { discordId, currency, amount });
	}

	async set(discordId: string, currency: Currency, amount: number): Promise<ApiResponse<BalanceUpdate>> {
		return await this.api.post<BalanceUpdate>('/economy/set', { discordId, currency, amount });
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
			embeds: [Embeds.buildHistoryEmbed(member, data, types)],
			components: [Components.buildHistoryButtons(discordId, page, data.pages, types), Components.buildHistorySelect(discordId, page)]
		};
	}
}
