export interface BlackjackGame {
	channelId: string;
	messageId: string;
	userId: string;
	deckId: string;
	bet: number;
	initialBet: number;
	playerCards: string[];
	dealerCards: string[];
	status: 'playing' | 'dealer_turn' | 'finished';
	result?: 'win' | 'lose' | 'draw' | 'blackjack' | 'timeout';
	timer?: NodeJS.Timeout;
}
