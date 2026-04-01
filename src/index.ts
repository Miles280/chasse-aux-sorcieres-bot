import './lib/setup';

import { LogLevel, SapphireClient, container } from '@sapphire/framework';
import { GatewayIntentBits } from 'discord.js';
import { ApiClient } from './services/apiClient.service';
import { EconomyService } from './services/economy.service';
import { DiscordService } from './services/discord.service';
import { ShopService } from './services/shop.service';
import { InventoryService } from './services/inventory.service';
import { TowerService } from './services/tower.service';
import { CasinoService } from './services/casino.service';
import { RouletteService } from './services/roulette.service';
import { BlackjackService } from './services/blackjack.service';
import { MoreOrLessService } from './services/moreOrLess.service';

const client = new SapphireClient({
	defaultPrefix: ',',
	caseInsensitiveCommands: true,
	logger: {
		level: LogLevel.Debug
	},
	intents: [GatewayIntentBits.DirectMessages, GatewayIntentBits.GuildMessages, GatewayIntentBits.Guilds, GatewayIntentBits.MessageContent],
	loadMessageCommandListeners: true
});

container.discordService = new DiscordService();
container.apiClient = new ApiClient(process.env.API_URL!, process.env.BOT_SECRET_KEY!);
container.economyService = new EconomyService(container.apiClient);
container.shopService = new ShopService(container.apiClient);
container.inventoryService = new InventoryService(container.apiClient);
container.casinoService = new CasinoService(container.apiClient);
container.towerService = new TowerService();
container.rouletteService = new RouletteService();
container.moreOrLessService = new MoreOrLessService();
container.blackjackService = new BlackjackService();

const main = async () => {
	try {
		client.logger.info('Logging in');
		await client.login();
		client.logger.info('logged in');
	} catch (error) {
		client.logger.fatal(error);
		await client.destroy();
		process.exit(1);
	}
};

void main();
