import { Currency } from '../enums/Currency';
import { ApiResponse } from '../models/ApiResponse.interface';
import { InventoryResponse } from '../models/Shop.interface';
import { ApiClient } from './apiClient.service';

export class InventoryService {
	constructor(private api: ApiClient) {}

	async getInventory(discordId: string): Promise<InventoryResponse> {
		try {
			const response = await this.api.post<InventoryResponse>(`/inventory/view`, { discordId });
			return response;
		} catch (err) {
			console.error(`[InventoryService] error in getInventory method :`, err);
			return { items: [], error: 'Une erreur est survenue lors de la récupération des items de ton inventaire.' };
		}
	}

	async tradeItem(sellerId: string, buyerId: string, itemId: number, currency: Currency, price: number): Promise<ApiResponse> {
		try {
			return await this.api.post<any>(`/inventory/sell`, { sellerId, buyerId, itemId, currency, price });
		} catch (err) {
			console.error(`[InventoryService] error in tradeItem method :`, err);
			return { error: "Une erreur est survenue lors de la vente de l'item." };
		}
	}
}
