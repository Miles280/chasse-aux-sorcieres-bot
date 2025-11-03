import { ApiClient } from './ApiClient';
import { UserBalance } from '../models/User';

export class EconomyService {
	constructor(private api: ApiClient) {}

	async getBalance(): Promise<UserBalance | null> {
		try {
			const raw = await this.api.get<any>(`/users/1`);
			return {
				id: raw.id,
				discordId: raw.discordId,
				gems: raw.gems,
				rubies: raw.rubies
			};
		} catch (err) {
			console.error(`[EconomyService] Error:`, err);
			return null;
		}
	}
}
