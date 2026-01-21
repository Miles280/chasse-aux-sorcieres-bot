import { Currency } from '../enums/Currency';
import { Item, Shop } from '../models/Shop.interface';
import { ApiClient } from './apiClient.service';
import { ApiResponse } from '../models/ApiResponse.interface';

export class ShopService {
	constructor(private api: ApiClient) {}

	async getArticles(currency: Currency, page: number): Promise<ApiResponse<Shop>> {
		return await this.api.get<Shop>(`/shop/view?currency=${currency}&page=${page}`);
	}

	async getAllArticles(): Promise<ApiResponse<Item[]>> {
		const response = await this.api.get<Item[]>(`/shop/viewall`);
		return response;
	}

	async buyArticle(discordId: string, itemId: number): Promise<ApiResponse> {
		try {
			return await this.api.post<ApiResponse>(`/shop/buy`, { discordId, itemId });
		} catch (err) {
			console.error(`[ShopService] error in buyArticle method :`, err);
			return { error: "Une erreur est survenue lors de l'achat de votre article." };
		}
	}

	async getDetail(itemId: number): Promise<ApiResponse<Item>> {
		return await this.api.post<Item>(`/shop/detail`, { itemId });
	}
}
