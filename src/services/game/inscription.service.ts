import { ApiClient } from './../apiClient.service';
import { ApiResponse } from '../../models/ApiResponse.interface';
import { GameData, InscriptionResponse } from '../../models/Game.interface';

export class InscriptionService {
	constructor(private api: ApiClient) {}

	/**
	 * Crée une nouvelle partie
	 */
	async create(gameMasterId: string): Promise<ApiResponse<GameData>> {
		return await this.api.post<GameData>('/games/create', {
			gameMasterId
		});
	}

	/**
	 * Récupère la partie en attente d'inscription sur le serveur
	 */
	async getWaitingGame(): Promise<ApiResponse<GameData>> {
		return await this.api.get<GameData>('/games/waiting');
	}

	/**
	 * Récupère une partie par son ID
	 */
	async getGameById(gameId: number): Promise<ApiResponse<GameData>> {
		return await this.api.get<GameData>(`/games/${gameId}`);
	}

	/**
	 * Met à jour les IDs des messages d'interface (Inscription et Compo)
	 */
	async updateMessages(gameId: number, inscriptionMessageId: string, compoMessageId: string): Promise<ApiResponse<any>> {
		return await this.api.patch<any>(`/games/messages/${gameId}`, {
			inscriptionMessageId,
			compoMessageId
		});
	}

	/**
	 * Gère l'inscription ou la désinscription d'un joueur (Toggle)
	 * action: 'join' | 'leave'
	 */
	async inscription(gameId: number, discordId: string, action: 'join' | 'leave'): Promise<ApiResponse<InscriptionResponse>> {
		return await this.api.post<InscriptionResponse>(`/games/inscription/${gameId}`, {
			discordId,
			action
		});
	}

	/**
	 * Ferme les inscriptions et passe la partie en "IN_PROGRESS"
	 */
	async closeInscription(gameId: number): Promise<ApiResponse<{ message: string }>> {
		return await this.api.patch<{ message: string }>(`/games/${gameId}/close`, {});
	}

	/**
	 * Annule et supprime une partie en attente
	 */
	async cancelGame(gameId: number): Promise<ApiResponse<{ message: string }>> {
		return await this.api.delete<{ message: string }>(`/games/${gameId}`);
	}
}
