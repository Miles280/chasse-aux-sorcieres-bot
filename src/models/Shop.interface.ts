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
}

export interface ShopView {
	items: Item[];
	page: number;
	total: number;
	pages: number;
	error?: string;
}
