import { ApiClient } from './ApiClient';
import { Currency } from '../enums/Currency';
import { Transaction } from '../models/Transaction';
import { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder, StringSelectMenuBuilder } from 'discord.js';
import { formatTransactions } from '../utils/formatTransactions';
import { TransactionType } from '../enums/TransactionType';

export interface UserBalance {
	gems: number;
	rubies: number;
	transactions?: Transaction[];
}

export interface TransactionResponse {
	success: boolean;
	currency?: Currency;
	old?: number;
	balance?: UserBalance;
	error?: string;
}

export interface TransactionHistory {
	transactions: Transaction[];
	page: number;
	total: number;
	pages: number;
	error?: string;
}

export class EconomyService {
	constructor(private api: ApiClient) {}

	async view(discordId: string): Promise<TransactionResponse> {
		try {
			const balance = await this.api.get<UserBalance>(`/economy/${discordId}`);
			return { success: true, balance };
		} catch (err) {
			console.error(`[EconomyService] error in view method :`, err);
			return { success: false, error: 'Une erreur est survenue lors de la récupération du solde.' };
		}
	}

	async give(senderId: string, receiverId: string, currency: Currency, amount: number): Promise<TransactionResponse> {
		try {
			return await this.api.post<TransactionResponse>('/economy/give', { senderId, receiverId, currency, amount });
		} catch (err: any) {
			console.error('[EconomyService] error in give method :', err);
			return { success: false, error: err.response.data.error || 'Une erreur est survenue lors de la transaction.' };
		}
	}

	async add(discordId: string, currency: Currency, amount: number): Promise<TransactionResponse> {
		try {
			return await this.api.post<TransactionResponse>('/economy/add', { discordId, currency, amount });
		} catch (err: any) {
			console.error('[EconomyService] error in add method :', err);
			return { success: false, error: err.response.data.error || 'Une erreur est survenue lors de la transaction.' };
		}
	}

	async remove(discordId: string, currency: Currency, amount: number): Promise<TransactionResponse> {
		try {
			return await this.api.post<TransactionResponse>('/economy/remove', { discordId, currency, amount });
		} catch (err: any) {
			console.error('[EconomyService] error in remove method :', err);
			return { success: false, error: err.response.data.error || 'Une erreur est survenue lors de la transaction.' };
		}
	}

	async set(discordId: string, currency: Currency, amount: number): Promise<TransactionResponse> {
		try {
			return await this.api.post<TransactionResponse>('/economy/set', { discordId, currency, amount });
		} catch (err: any) {
			console.error('[EconomyService] error in set method :', err);
			return { success: false, error: err.response.data.error || 'Une erreur est survenue lors de la transaction.' };
		}
	}

	async getTransactions(discordId: string, page = 1, types: string[] = []): Promise<TransactionHistory> {
		try {
			const queryParams = new URLSearchParams({
				page: String(page),
				types: types.join(',')
			});
			const response = await this.api.get<TransactionHistory>(`/economy/transactions/${discordId}?${queryParams.toString()}`);

			return response;
		} catch (err: any) {
			console.error('[EconomyService] error in getTransactions method :', err);
			return {
				transactions: [],
				page,
				total: 0,
				pages: 0,
				error: 'Erreur lors de la récupération des transactions.'
			};
		}
	}

	public async buildHistoryMessage(
		discordId: string,
		page = 1,
		types: string[] = []
	): Promise<{ embeds: EmbedBuilder[]; components: (ActionRowBuilder<ButtonBuilder> | ActionRowBuilder<StringSelectMenuBuilder>)[] }> {
		const data = await this.getTransactions(discordId, page, types);

		// Utilisation de ton utilitaire pour générer la description
		const description = formatTransactions(data.transactions);

		const embed = new EmbedBuilder()
			.setTitle(`📜 Historique des transactions`)
			.setDescription(description)
			.setFooter({ text: `Page ${data.page}/${data.pages}` })
			.setColor(0x360a5c)
			.setTimestamp();

		// Boutons de pagination
		const buttons = new ActionRowBuilder<ButtonBuilder>().addComponents(
			new ButtonBuilder()
				.setCustomId(`history_prev_${discordId}_${page}_${types.join(',')}`)
				.setLabel('◀️ Précédent')
				.setStyle(ButtonStyle.Secondary)
				.setDisabled(page <= 1),
			new ButtonBuilder()
				.setCustomId(`history_next_${discordId}_${page}_${types.join(',')}`)
				.setLabel('Suivant ▶️')
				.setStyle(ButtonStyle.Secondary)
				.setDisabled(page >= data.pages)
		);

		const transactionTypeLabels: Record<TransactionType, string> = {
			[TransactionType.GAIN]: 'Gain',
			[TransactionType.LOSE]: 'Perte',
			[TransactionType.PURCHASE]: 'Achat',
			[TransactionType.DONATION]: 'Donation',
			[TransactionType.RECEIVE]: 'Reçu',
			[TransactionType.CONVERSION]: 'Conversion',
			[TransactionType.ADMIN]: 'Ajustement',
			[TransactionType.SET]: 'Solde défini'
		};
		// Menu de sélection des types
		const selectMenu = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
			new StringSelectMenuBuilder()
				.setCustomId(`history_filter_${discordId}_${page}`)
				.setPlaceholder('Filtrer par type...')
				.setMinValues(0)
				.setMaxValues(5)
				.addOptions(
					[{ label: 'Tous les types', value: 'ALL' }].concat(
						Object.values(TransactionType).map((type) => ({
							label: transactionTypeLabels[type as TransactionType] || type,
							value: type.toUpperCase()
						}))
					)
				)
		);

		return { embeds: [embed], components: [buttons, selectMenu] };
	}
}
