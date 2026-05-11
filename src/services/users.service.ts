import { ApiClient } from './apiClient.service';
import { ApiResponse } from '../models/ApiResponse.interface';

export class UsersService {
	constructor(private api: ApiClient) {}

	async getRoles(discordId: string): Promise<ApiResponse<string[]>> {
		return await this.api.get<string[]>(`/user/roles/${discordId}`);
	}
}
