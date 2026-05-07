// Les types de paris possibles
export type RouletteBetType = 'red' | 'black' | 'even' | 'odd' | 'low' | 'high' | number;

// Représente la mise d'un seul joueur
export interface RouletteBet {
	userId: string;
	amount: number;
	type: RouletteBetType;
}

// Représente la session de jeu dans le channel
export interface RouletteGame {
	channelId: string;
	messageId: string;
	spinMessageId?: string;
	status: 'betting' | 'spinning' | 'finished';
	bets: RouletteBet[];
	endsAt: number;
	createdAt: number;
	timer?: NodeJS.Timeout;
}
