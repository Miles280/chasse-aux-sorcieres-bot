import { Currency } from '../enums/Currency';
import { AllItem, InventoryResponse, Item, ItemDetailResponse, ShopResponse } from '../models/Shop.interface';
import { ApiClient } from './apiClient.service';
import * as Components from '../utils/components';
import { ApiResponse } from '../models/ApiResponse.interface';

export class ShopService {
	constructor(private api: ApiClient) {}

	async getArticles(currency: Currency, page: number): Promise<ShopResponse> {
		try {
			return await this.api.get<ShopResponse>(`/shop/view?currency=${currency}&page=${page}`);
		} catch (err) {
			console.error(`[ShopService] error in getArticles method :`, err);
			return { items: [], page: 1, total: 0, pages: 1, error: 'Une erreur est survenue lors de la récupération des items de la boutique.' };
		}
	}

	async getAllArticles(): Promise<AllItem> {
		try {
			const response = await this.api.get<AllItem>(`/shop/viewall`);
			return response;
		} catch (err) {
			console.error(`[ShopService] error in getArticles method :`, err);
			return { items: [], error: 'Une erreur est survenue lors de la récupération des items de la boutique.' };
		}
	}

	async buyArticle(discordId: string, itemId: number): Promise<ApiResponse> {
		try {
			return await this.api.post<ApiResponse>(`/shop/buy`, { discordId, itemId });
		} catch (err) {
			console.error(`[ShopService] error in buyArticle method :`, err);
			return { error: "Une erreur est survenue lors de l'achat de votre article." };
		}
	}

	async buildShopView(currency: Currency, page: number) {
		const data = await this.getArticles(currency, page);

		if (data.error) {
			return { error: data.error };
		}

		const container = Components.buildShopContainer();

		for (const item of data.items) {
			const { separator, section } = Components.buildShopItem(item, currency, page);

			container.components.push(separator);
			container.components.push(section);
		}

		const { separator, footer } = Components.buildShopFooter(data);
		container.components.push(separator);
		container.components.push(footer);

		const buttons = Components.buildShopButtons(currency, data.page, data.pages);

		return { components: [container, buttons] };
	}

	async getInventory(discordId: string): Promise<InventoryResponse> {
		try {
			const response = await this.api.post<InventoryResponse>(`/inventory/view`, { discordId });
			return response;
		} catch (err) {
			console.error(`[InventoryService] error in getInventory method :`, err);
			return { items: [], error: 'Une erreur est survenue lors de la récupération des items de ton inventaire.' };
		}
	}

	async getDetail(itemId: number): Promise<ItemDetailResponse> {
		try {
			const response = await this.api.post<Item>(`/shop/detail`, { itemId });
			return { item: response };
		} catch (err) {
			console.error(`[InventoryService] error in getInventory method :`, err);
			return { item: null, error: "Une erreur est survenue lors de la récupération du détail d'un item." };
		}
	}
}
