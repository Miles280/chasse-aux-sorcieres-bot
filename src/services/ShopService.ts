import { Currency } from '../enums/Currency';
import { ShopView } from '../models/Shop';
import { ApiClient } from './ApiClient';
import { container } from '@sapphire/framework';
import * as Embeds from '../utils/embeds';
import * as Components from '../utils/components';
// import { GuildMember } from 'discord.js';

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
		const data = await container.shopService.getArticles(currency, page);

		if (data.error) {
			return {
				embeds: [Embeds.errorEmbed({ message: data.error })],
				components: []
			};
		}

		const maxPage = data.pages!;

		return {
			embeds: [Embeds.shopEmbed(data)],
			components: [Components.buildShopButtons(currency, data.page!, maxPage)]
		};
	}
}
