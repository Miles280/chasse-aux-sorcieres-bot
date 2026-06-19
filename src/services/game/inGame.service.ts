import { ApiResponse } from '../../models/ApiResponse.interface';
import { GameData } from '../../models/game/Game.interface';
import { ApiClient } from '../apiClient.service';

export class InGameService {
	constructor(private api: ApiClient) {}

	async updateStep(gameId: number, step: string): Promise<ApiResponse<GameData>> {
		return await this.api.patch<GameData>(`/game/${gameId}/step`, { step });
	}
}
