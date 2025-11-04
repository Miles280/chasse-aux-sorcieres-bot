import axios, { AxiosInstance } from 'axios';

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

			if (config.headers) {
				config.headers.set('Authorization', `Bearer ${this.token}`);
			}

			return config;
		});
	}

	// Méthode pour récupérer un nouveau JWT depuis l'API Symfony
	private async refreshToken() {
		if (!this.botKey) throw new Error('BOT_KEY manquant');

		const res = await axios.post(`${this.baseURL}/bot/login`, null, {
			headers: {
				'X-BOT-KEY': this.botKey,
				'Content-Type': 'application/json'
			}
		});

		this.token = res.data.token;

		if (!this.token) {
			throw new Error('Le serveur n’a pas renvoyé de token JWT.');
		}

		// Décoder l'expiration du JWT
		const payload = JSON.parse(Buffer.from(this.token.split('.')[1], 'base64').toString());
		this.tokenExpiresAt = payload.exp * 1000; // timestamp en ms
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
