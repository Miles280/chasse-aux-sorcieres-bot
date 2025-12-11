import type { ApiClient } from '../services/apiClient.service';
import { DiscordService } from '../services/discord.service';
import { EconomyService } from '../services/economy.service';
import { InventoryService } from '../services/inventory.service';
import { ShopService } from '../services/shop.service';

declare module '@sapphire/pieces' {
	interface Container {
		apiClient: ApiClient;
		economyService: EconomyService;
		discordService: DiscordService;
		shopService: ShopService;
		inventoryService: InventoryService;
	}
}
