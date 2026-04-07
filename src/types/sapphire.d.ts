import type { ApiClient } from '../services/apiClient.service';
import { CasinoService } from '../services/casino/casino.service';
import { DiscordService } from '../services/discord.service';
import { MoreOrLessService } from '../services/casino/MoreOrLess.service';
import { EconomyService } from '../services/economy-core/economy.service';
import { ShopService } from '../services/economy-core/shop.service';
import { InventoryService } from '../services/economy-core/inventory.service';
import { TowerService } from '../services/casino/tower.service';
import { RouletteService } from '../services/casino/roulette.service';
import { BlackjackService } from '../services/casino/blackjack.service';
import { RolesService } from '../services/game/roles.service';

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
		moreOrLessService: MoreOrLessService;
		blackjackService: BlackjackService;
		rolesService: RolesService;
	}
}
