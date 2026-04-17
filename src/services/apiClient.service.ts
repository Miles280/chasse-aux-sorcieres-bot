import axios, { AxiosInstance } from 'axios';
import { ApiResponse } from '../models/ApiResponse.interface';

export class ApiClient {
	private client: AxiosInstance;
	private token: string | null = null;
	private tokenExpiresAt: number = 0;

	constructor(
		private baseURL: string,
		private botKey: string
	) {
		this.client = axios.create({
			baseURL,
			headers: {
				'Content-Type': 'application/json'
			}
		});

		// Interceptor request pour gérer JWT
		this.client.interceptors.request.use(async (config) => {
			if (!this.token || Date.now() >= this.tokenExpiresAt) {
				await this.refreshToken();
			}

			if (config.headers && this.token) {
				config.headers.set('Authorization', `Bearer ${this.token}`);
			}

			return config;
		});
	}

	// Méthode pour récupérer un nouveau JWT depuis l'API Symfony
	private async refreshToken() {
		if (!this.botKey) throw new Error('BOT_KEY manquant');

		const res = await axios.post<ApiResponse<{ token: string }>>(`${this.baseURL}/auth/login`, null, {
			headers: {
				'BOT-SECRET-KEY': this.botKey,
				'Content-Type': 'application/json'
			}
		});

		if (!res.data.success) {
			throw new Error(`Auth failed: ${res.data.error}`);
		}

		this.token = res.data.data.token;

		if (!this.token) {
			throw new Error('Le serveur n’a pas renvoyé de token JWT.');
		}

		// Décoder l'expiration du JWT
		const payload = JSON.parse(Buffer.from(this.token.split('.')[1], 'base64').toString());
		this.tokenExpiresAt = payload.exp * 1000; // timestamp en ms
	}

	async get<T>(url: string): Promise<ApiResponse<T>> {
		try {
			const res = await this.client.get<ApiResponse<T>>(url);
			return res.data;
		} catch (error: any) {
			return this.handleError(error);
		}
	}

	async post<T>(url: string, data: any): Promise<ApiResponse<T>> {
		try {
			const res = await this.client.post<ApiResponse<T>>(url, data);
			return res.data;
		} catch (error: any) {
			return this.handleError(error);
		}
	}

	async put<T>(url: string, data: any): Promise<ApiResponse<T>> {
		try {
			const res = await this.client.put<ApiResponse<T>>(url, data);
			return res.data;
		} catch (error: any) {
			return this.handleError(error);
		}
	}

	async patch<T>(url: string, data: any): Promise<ApiResponse<T>> {
		try {
			const res = await this.client.patch<ApiResponse<T>>(url, data);
			return res.data;
		} catch (error: any) {
			return this.handleError(error);
		}
	}

	async delete<T>(url: string): Promise<ApiResponse<T>> {
		try {
			const res = await this.client.delete<ApiResponse<T>>(url);
			return res.data;
		} catch (error: any) {
			return this.handleError(error);
		}
	}

	/**
	 * Centralisation de la gestion des erreurs Axios
	 */
	private handleError(error: any): ApiResponse<any> {
		if (axios.isAxiosError(error) && error.response) {
			// Si Symfony a renvoyé un JSON d'erreur formaté
			return error.response.data as ApiResponse<any>;
		}
		return { success: false, error: "Erreur de communication avec l'API." };
	}
}
