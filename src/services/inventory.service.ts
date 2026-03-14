import { Currency } from '../enums/Currency';
import { ApiResponse, ValidationResponse } from '../models/ApiResponse.interface';
import { Inventory } from '../models/Shop.interface';
import { ApiClient } from './apiClient.service';

export class InventoryService {
	constructor(private api: ApiClient) {}

	async getUserInventory(discordId: string): Promise<ApiResponse<Inventory>> {
		return await this.api.post<Inventory>(`/inventory/view`, { discordId });
	}

	async tradeItem(sellerId: string, buyerId: string, itemId: number, currency: Currency, price: number): Promise<ApiResponse<ValidationResponse>> {
		return await this.api.post<ValidationResponse>(`/inventory/sell`, { sellerId, buyerId, itemId, currency, price });
	}

	async manageItem(discordId: string, itemId: number, action: 'add' | 'remove'): Promise<ApiResponse<ValidationResponse>> {
		return await this.api.post<ValidationResponse>(`/inventory/manage`, { discordId, itemId, action });
	}
}
