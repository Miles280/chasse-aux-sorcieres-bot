import { ApiClient } from './apiClient.service';
import { ApiResponse } from '../models/ApiResponse.interface';
import { ServerConfig } from '../models/ServerConfig.interface';

export class ServerConfigService {
	constructor(private api: ApiClient) {}

	async getConfig(guildId: string): Promise<ApiResponse<ServerConfig>> {
		return await this.api.get<ServerConfig>(`/server-config/${guildId}`);
	}

	async updateConfig(guildId: string, data: Partial<ServerConfig>): Promise<ApiResponse<ServerConfig>> {
		return await this.api.post<ServerConfig>(`/server-config/update`, {
			discordServerId: guildId,
			...data
		});
	}
}
