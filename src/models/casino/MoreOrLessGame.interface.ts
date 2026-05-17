export interface PlayerState {
	id: string; // L'ID Discord, ou 'bot'
	lives: number; // Commence à 3
}

export interface Card {
	code: string;
	image: string;
	value: number; // Converti de l'API (ex: JACK = 11, ACE = 14)
}

export interface TurnHistory {
	playerId: string;
	choice: 'more' | 'less';
	previousValue: number;
	newValue: number;
	success: boolean;
	timestamp: number;
}

export interface MoreOrLessGame {
	messageId: string;
	channelId: string;
	deckId: string;
	bet: number;
	player1: { id: string; lives: number };
	player2: { id: string; lives: number };
	currentTurnId: string;
	currentCard: Card;
	status: 'pending' | 'playing' | 'finished' | 'cancelled';
	lastTurnHistory?: TurnHistory;
	totalCards?: number;
	remainingCards?: number;
	totalLives: number;
	expiresAt?: number; // Pour le timestamp Discord <t:X:R>
	turnStartTime?: number; // Timestamp du début du tour
	turnTimeLimit?: number; // Durée du tour (30000ms)
	timer?: NodeJS.Timeout;
	timerWarning?: NodeJS.Timeout;

	challengeMessageId?: string;
}

export interface TurnResult {
	status: 'continue' | 'win' | 'error';
	message?: string;
	game?: MoreOrLessGame;
	winnerId?: string;
	loserId?: string;
	drawnCard?: Card; // <-- NOUVEAU : pour le reveal
	choice?: 'more' | 'less'; // <-- NOUVEAU : pour le reveal
}

export interface DeckApiResponse {
	success: boolean;
	deck_id: string;
	remaining: number;
	shuffled: boolean;
}

export interface DrawApiResponse {
	success: boolean;
	deck_id: string;
	cards: {
		code: string;
		image: string;
		value: string;
		suit: string;
	}[];
	remaining: number;
}
