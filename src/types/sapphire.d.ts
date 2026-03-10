import type { ApiClient } from '../services/apiClient.service';
import { CasinoService } from '../services/casino.service';
import { DiscordService } from '../services/discord.service';
import { EconomyService } from '../services/economy.service';
import { InventoryService } from '../services/inventory.service';
import { RouletteService } from '../services/roulette.service';
import { ShopService } from '../services/shop.service';
import { TowerService } from '../services/tower.service';

declare module '@sapphire/pieces' {
	interface Container {
		apiClient: ApiClient;
		economyService: EconomyService;
		discordService: DiscordService;
		shopService: ShopService;
		inventoryService: InventoryService;
		casinoService: CasinoService;
		towerService: TowerService;
		rouletteService: RouletteService;
	}
}
