import { EmbedBuilder, InteractionResponse, Message } from 'discord.js';

export interface TowerGame {
	userId: string;
	bet: number;
	currentFloor: number; // De 0 à 9
	grid: number[]; // Tableau de 10 entiers (0, 1 ou 2 indiquent la position de la bombe pour chaque étage)
	history: number[]; // Stocke les choix du joueur (ex: [1, 0, 2] pour les 3 premiers étages)
	message: Message | InteractionResponse; // Référence au message pour pouvoir l'éditer en cas de timeout
	timer: NodeJS.Timeout;
}

export interface TowerResult {
	error?: string;
	finished?: boolean;
	payload?: {
		embeds: EmbedBuilder[];
		components: any[];
	};
}
