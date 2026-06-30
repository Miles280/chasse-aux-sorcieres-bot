export type TileType = 'BOMB' | 'MULTI' | 'EMPTY';

export interface Tile {
	type: TileType;
	value?: number; // Présent uniquement si le type est 'MULTI'
}

export interface ActiveMineGame {
	messageId: string;
	channelId: string;
	userId: string;
	bet: number;
	currentMultiplier: number;
	grid: Tile[];
	revealed: number[];
	status: 'PLAYING' | 'WON' | 'LOST' | 'TIMEOUT';
	timer: NodeJS.Timeout; // <-- Ajout du timer
}

export interface MineTurnResult {
	status: 'continue' | 'win' | 'lose' | 'cashout' | 'error' | 'timeout';
	game?: ActiveMineGame;
	payout?: number;
	message?: string;
}
