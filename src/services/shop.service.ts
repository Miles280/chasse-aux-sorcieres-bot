import { Currency } from '../enums/Currency';
import { ShopView } from '../models/Shop.interface';
import { ApiClient } from './apiClient.service';
import * as Components from '../utils/components';

export class ShopService {
	constructor(private api: ApiClient) {}

	async getArticles(currency: Currency, page: number): Promise<ShopView> {
		try {
			const shopData = await this.api.get<ShopView>(`/shop/view?currency=${currency}&page=${page}`);
			return shopData;
		} catch (err) {
			console.error(`[ShopService] error in getArticles method :`, err);
			return { items: [], page: 1, total: 0, pages: 1, error: 'Une erreur est survenue lors de la récupération des items de la boutique.' };
		}
	}

	async buildShopView(currency: Currency, page: number) {
		const data = await this.getArticles(currency, page);

		if (data.error) {
			return { error: data.error };
		}

		const container = Components.buildShopContainer();

		for (const item of data.items) {
			const { separator, section } = Components.buildShopItem(item, currency);

			container.components.push(separator);
			container.components.push(section);
		}

		const { separator, footer } = Components.buildShopFooter(data);
		container.components.push(separator);
		container.components.push(footer);

		const buttons = Components.buildShopButtons(currency, data.page, data.pages);

		return { components: [container, buttons] };
	}
}
