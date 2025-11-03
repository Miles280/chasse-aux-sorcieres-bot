import axios, { AxiosInstance } from 'axios';

export class ApiClient {
	private client: AxiosInstance;

	constructor(baseURL: string, apiKey?: string) {
		this.client = axios.create({
			baseURL,
			headers: {
				'Content-Type': 'application/json',
				...(apiKey && { Authorization: `Bearer ${apiKey}` })
			}
		});
	}

	async get<T>(url: string): Promise<T> {
		const response = await this.client.get<T>(url);
		return response.data;
	}

	async post<T>(url: string, data: any): Promise<T> {
		const response = await this.client.post<T>(url, data);
		return response.data;
	}

	async put<T>(url: string, data: any): Promise<T> {
		const response = await this.client.put<T>(url, data);
		return response.data;
	}

	async delete<T>(url: string): Promise<T> {
		const response = await this.client.delete<T>(url);
		return response.data;
	}
}
