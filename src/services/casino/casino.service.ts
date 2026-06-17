import { ApiClient } from '../apiClient.service';
import { ApiResponse } from '../../models/ApiResponse.interface';
import { CasinoUpdate } from '../../models/economy-core/Economy.interface';

export class CasinoService {
	constructor(private api: ApiClient) {}

	async transaction(discordId: string, amount: number, operation: 'add' | 'remove'): Promise<ApiResponse<CasinoUpdate>> {
		return await this.api.post<CasinoUpdate>('/casino/transaction', { discordId, amount, operation });
	}

	public logGame(userId: string, gameName: string, betAmount: number, winAmount: number, details: any) {
		try {
			this.api.post<void>('/casino/log-game', {
				discordId: userId,
				gameName: gameName,
				betAmount: betAmount,
				winAmount: winAmount,
				details: details
			});
		} catch (err) {
			console.error('[CasinoService] error in logGame method :', err);
		}
	}
}
