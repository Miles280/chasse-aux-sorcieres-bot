export interface TowerGame {
	userId: string;
	messageId: string;
	channelId: string; // Ajouté pour pouvoir retrouver le message lors du Timeout
	bet: number;
	currentFloor: number; // 0 à 9
	grid: number[]; // Tableau de 10 entiers (0, 1, 2)
	history: number[]; // Les choix du joueur
	timer: NodeJS.Timeout;
}

export interface TowerTurnResult {
	status: 'continue' | 'win' | 'lose' | 'cashout' | 'error';
	game?: TowerGame;
	payout?: number; // Gain en cas de victoire/cashout
	badChoice?: number; // La position de la bombe qui a tué le joueur
	message?: string; // En cas d'erreur
}
