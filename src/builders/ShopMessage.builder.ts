import { Currency } from '../enums/Currency';
import { Shop } from '../models/Shop.interface';
import * as Components from '../utils/components';

export class ShopMessageBuilder {
	// On ne met pas de async ici, on reçoit directement les données
	public static build(currency: Currency, page: number, data: Shop) {
		const { items, pagination } = data;
		const empty = items.length === 0;

		const containerComponent = Components.buildShopContainer(empty);

		// On boucle sur les items reçus
		for (const item of items) {
			const { separator, section } = Components.buildShopItem(item, currency, page);
			containerComponent.components.push(separator, section);
		}

		const { separator, footer } = Components.buildShopFooter(pagination);
		containerComponent.components.push(separator, footer);

		const buttons = Components.buildShopButtons(currency, pagination.currentPage, pagination.totalPages);

		return { components: [containerComponent, buttons] };
	}
}
