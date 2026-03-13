import { Currency } from '../enums/Currency';
import { ShopType } from '../enums/ShopType';
import { PaginationData } from './ApiResponse.interface';

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
	pagination: PaginationData;
}
