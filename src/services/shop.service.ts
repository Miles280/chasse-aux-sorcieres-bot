import { Currency } from '../enums/Currency';
import { ShopView } from '../models/Shop.interface';
import { ApiClient } from './apiClient.service';
// import * as Embeds from '../utils/embeds';
import * as Components from '../utils/components';
import { ButtonStyle, SectionBuilder, SeparatorBuilder, SeparatorSpacingSize, TextDisplayBuilder } from 'discord.js';
import { ContainerBuilder } from 'discord.js';
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
		const title = new TextDisplayBuilder().setContent('# Boutique de Nistrium');

		const articles = await this.getArticles(currency, page);

		// 1) Créer ton container
		const mainContainer = new ContainerBuilder().setAccentColor(0x360a5c).addTextDisplayComponents(title);

		// 2) Ajouter tous les articles dans mainContainer
		for (const item of articles.items) {
			const separator = new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true);

			const section = new SectionBuilder()
				.addTextDisplayComponents((td) => td.setContent(`**${item.name}**\n-# ${item.description}\nPrix : ${item.price} ${item.currency}`))
				.setButtonAccessory((btn) => btn.setCustomId(`buy_${item.id}_${currency}`).setLabel('Acheter').setStyle(ButtonStyle.Success));

			mainContainer.components.push(separator);
			mainContainer.components.push(section);
		}

		// 3) Envoyer le message
		return { components: [mainContainer, Components.buildShopButtons(currency, articles.page!, articles.pages!)] };
	}
}
