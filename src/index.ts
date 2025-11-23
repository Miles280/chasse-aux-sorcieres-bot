import './lib/setup';

import { LogLevel, SapphireClient, container } from '@sapphire/framework';
import { GatewayIntentBits } from 'discord.js';
import { ApiClient } from './services/ApiClient';
import { EconomyService } from './services/EconomyService';
import { DiscordService } from './services/DiscordService';
import { ShopService } from './services/ShopService';

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
