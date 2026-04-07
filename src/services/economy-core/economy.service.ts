import { ApiClient } from './../apiClient.service';
import { Currency } from '../../enums/Currency';
import { BalanceUpdate, ConversionData, ConversionRates, TransactionHistory, UserBalance } from '../../models/Economy.interface';
import { ApiResponse } from '../../models/ApiResponse.interface';

export class EconomyService {
	constructor(private api: ApiClient) {}

	async view(discordId: string): Promise<ApiResponse<UserBalance>> {
		return await this.api.get<UserBalance>(`/economy/view/${discordId}`);
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

	async convert(discordId: string, amount: number): Promise<ApiResponse<ConversionData>> {
		return await this.api.post<ConversionData>('/economy/convert', { discordId, amount });
	}

	async getTransactions(discordId: string, page: number = 1, types: string[] = []): Promise<ApiResponse<TransactionHistory>> {
		const queryParams = new URLSearchParams({
			page: String(page),
			types: types.join(',')
		});
		return await this.api.get<TransactionHistory>(`/economy/transactions/${discordId}?${queryParams.toString()}`);
	}

	async getConversionRate(discordId: string): Promise<ApiResponse<ConversionRates>> {
		return await this.api.get<ConversionRates>(`/economy/rates/${discordId}`);
	}

	async getLeaderboard(currency: Currency, page: number = 1): Promise<ApiResponse<any>> {
		// Idéalement, remplace "any" par une interface "LeaderboardData"
		const queryParams = new URLSearchParams({
			currency: currency,
			page: String(page)
		});
		return await this.api.get<any>(`/economy/leaderboard?${queryParams.toString()}`);
	}
}
