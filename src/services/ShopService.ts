import { Currency } from '../enums/Currency';
import { ShopView } from '../models/Shop';
import { ApiClient } from './ApiClient';
// import { GuildMember } from 'discord.js';
// import * as Embeds from '../utils/embeds';
// import * as Components from '../utils/components';

export class ShopService {
	constructor(private api: ApiClient) {}

	async view(currency: Currency, page: number): Promise<ShopView> {
		try {
			const shopData = await this.api.get<ShopView>(`/shop/view?currency=${currency}&page=${page}`);
			return shopData;
		} catch (err) {
			console.error(`[ShopService] error in view method :`, err);
			return { items: [], page: 1, total: 0, pages: 1, error: 'Une erreur est survenue lors de la récupération des items de la boutique.' };
		}
	}
}
