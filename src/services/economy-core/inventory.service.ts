import { Currency } from '../../enums/Currency';
import { ApiResponse, ValidationResponse } from '../../models/ApiResponse.interface';
import { Inventory } from '../../models/Shop.interface';
import { ApiClient } from './../apiClient.service';

export class InventoryService {
	constructor(private api: ApiClient) {}

	/**
	 * Récupère l'inventaire complet d'un utilisateur.
	 * Interroge l'API afin d'obtenir la liste des items possédés par le joueur.
	 */
	async getUserInventory(discordId: string): Promise<ApiResponse<Inventory>> {
		// 1. Appel API pour récupérer l'inventaire
		return await this.api.post<Inventory>(`/inventory/view`, { discordId });
	}

	/**
	 * Permet à un joueur de vendre un item à un autre joueur.
	 * Gère la transaction via l'API (validation + transfert).
	 */
	async tradeItem(sellerId: string, buyerId: string, itemId: number, currency: Currency, price: number): Promise<ApiResponse<ValidationResponse>> {
		// 1. Envoi de la demande de transaction à l'API
		return await this.api.post<ValidationResponse>(`/inventory/sell`, {
			sellerId,
			buyerId,
			itemId,
			currency,
			price
		});
	}

	/**
	 * Ajoute ou retire un item de l'inventaire d'un joueur.
	 * Utilisé principalement par les commandes administrateur.
	 */
	async manageItem(discordId: string, itemId: number, action: 'add' | 'remove'): Promise<ApiResponse<ValidationResponse>> {
		// 1. Envoi de la requête de modification à l'API
		return await this.api.post<ValidationResponse>(`/inventory/manage`, {
			discordId,
			itemId,
			action
		});
	}
}
