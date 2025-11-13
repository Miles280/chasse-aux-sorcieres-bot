import { HistoriqueCommand } from '../commands/historique';
import type { ApiClient } from '../services/ApiClient';
import { DiscordService } from '../services/DiscordService';
import { EconomyService } from '../services/EconomyService';

declare module '@sapphire/pieces' {
	interface Container {
		apiClient: ApiClient;
		economyService: EconomyService;
		discordService: DiscordService;
		historiqueCommand: HistoriqueCommand;
	}
}
