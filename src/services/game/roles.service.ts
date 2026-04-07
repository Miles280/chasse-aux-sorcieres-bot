import { ApiClient } from './../apiClient.service';
import { ApiResponse } from '../../models/ApiResponse.interface';
import { RoleInterface } from '../../models/Role.interface';
import { Camp } from '../../enums/Camp';

export class RolesService {
	constructor(private api: ApiClient) {}

	async getAllRoles(): Promise<ApiResponse<RoleInterface[]>> {
		return await this.api.get<RoleInterface[]>(`/roles`);
	}

	async getRolesByCamp(camp: Camp): Promise<ApiResponse<RoleInterface[]>> {
		return await this.api.get<RoleInterface[]>(`/roles/camp/${camp}`);
	}

	async getRole(roleId: number): Promise<ApiResponse<RoleInterface>> {
		return await this.api.get<RoleInterface>(`/roles/${roleId}`);
	}
}
