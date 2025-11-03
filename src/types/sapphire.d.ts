import type { ApiClient } from '../services/ApiClient';
import { EconomyService } from '../services/EconomyService';

declare module '@sapphire/pieces' {
	interface Container {
		apiClient: ApiClient;
		economyService: EconomyService;
	}
}
