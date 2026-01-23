import { Currency } from '../enums/Currency';
import { ShopType } from '../enums/ShopType';

export interface Item {
	id: number;
	name: string;
	description: string;
	currency: Currency;
	price: number;
	type: ShopType;
	discordRoleId?: string;
	quantity?: number;
	requiredItem?: Item;
	requiredRoleId?: string;
}

export interface Inventory {
	items: {
		id: number;
		quantity: number;
		item: Item;
	}[];
}

export interface Shop {
	items: Item[];
	pagination: {
		currentPage: number;
		totalPages: number;
		totalItems: number;
	};
}
