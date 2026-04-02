export interface BlackjackGame {
	channelId: string;
	messageId: string;
	userId: string;
	deckId: string;
	bet: number;
	playerCards: string[]; // URLs des images
	dealerCards: string[]; // URLs des images
	status: 'playing' | 'dealer_turn' | 'finished';
	result?: 'win' | 'lose' | 'draw' | 'blackjack' | 'timeout';
	timer?: NodeJS.Timeout;
}
