import { ApiClient } from './apiClient.service';
import { CasinoResponse } from '../models/Economy.interface';

export class CasinoService {
	constructor(private api: ApiClient) {}

	async transaction(discordId: string, amount: number, operation: 'add' | 'remove'): Promise<CasinoResponse> {
		try {
			return await this.api.post<CasinoResponse>('/casino/transaction', { discordId, amount, operation });
		} catch (err: any) {
			console.error('[CasinoService] error in transaction method :', err);
			return { error: err.response.data.error || "Une erreur est survenue lors de l'enregistrement de la transaction du casino." };
		}
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
