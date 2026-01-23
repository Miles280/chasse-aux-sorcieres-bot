import { Currency } from '../enums/Currency';
import { Item, Shop } from '../models/Shop.interface';
import { ApiClient } from './apiClient.service';
import { ApiResponse, ValidationResponse } from '../models/ApiResponse.interface';

export class ShopService {
	constructor(private api: ApiClient) {}

	async getArticles(currency: Currency, page: number): Promise<ApiResponse<Shop>> {
		return await this.api.get<Shop>(`/shop/view?currency=${currency}&page=${page}`);
	}

	async getAllArticles(): Promise<ApiResponse<Item[]>> {
		const response = await this.api.get<Item[]>(`/shop/viewall`);
		return response;
	}

	async buyArticle(discordId: string, itemId: number): Promise<ApiResponse<ValidationResponse>> {
		return await this.api.post<ValidationResponse>(`/shop/buy`, { discordId, itemId });
	}

	async getDetail(itemId: number): Promise<ApiResponse<Item>> {
		return await this.api.post<Item>(`/shop/detail`, { itemId });
	}
}
