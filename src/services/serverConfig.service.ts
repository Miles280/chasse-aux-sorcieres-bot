import { ApiClient } from './apiClient.service';
import { ApiResponse } from '../models/ApiResponse.interface';
import { ServerConfig } from '../models/ServerConfig.interface';

export class ServerConfigService {
	constructor(private api: ApiClient) {}

	async getConfig(guildId: string): Promise<ApiResponse<ServerConfig>> {
		return await this.api.get<ServerConfig>(`/server-config/${guildId}`);
	}

	// On passe le guildId et l'objet partiel à modifier
	async updateConfig(guildId: string, data: Partial<ServerConfig>): Promise<ApiResponse<ServerConfig>> {
		// On fusionne le guildId dans le body pour ton endpoint Symfony
		return await this.api.post<ServerConfig>(`/server-config/update`, {
			discordServerId: guildId,
			...data
		});
	}
}
