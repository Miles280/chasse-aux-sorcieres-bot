import { ApiClient } from './ApiClient';
import { UserBalance } from '../models/UserBalance';

export class EconomyService {
	constructor(private api: ApiClient) {}

	async getBalance(discordId: string): Promise<UserBalance | null> {
		try {
			return await this.api.get<UserBalance>(`/economy/balance/${discordId}`);
		} catch (err) {
			console.error(`[EconomyService] Error:`, err);
			return null;
		}
	}
}
