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

export interface ShopResponse {
	items: Item[];
	page: number;
	total: number;
	pages: number;
	error?: string;
}

export interface InventoryEntry {
	id: number;
	quantity: number;
	item: Item;
}

export interface InventoryResponse {
	items: InventoryEntry[];
	error?: string;
}

export interface ItemDetailResponse {
	item: Item | null;
	error?: string;
}
