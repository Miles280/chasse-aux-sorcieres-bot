export const TOWER_CONFIG = {
	// MULTIPLIERS: [1.35, 1.85, 2.6, 3.6, 5.0, 7.0, 10.0, 14.0, 19.0, 25.0],
	MULTIPLIERS: [1.45, 2.0, 3.0, 4.3, 6.2, 8.9, 12.8, 18.5, 27.5, 40],
	TIMEOUT_MS: 60000
} as const;

export const ROULETTE_CONFIG = {
	// TIMER DU LOBBY
	INITIAL_TIMER: 20_000,
	EXTENSION_TIME: 10_000,
	MAX_DURATION: 60_000,

	SPIN_DURATION_MS: 8_000,

	RED_NUMBERS: [1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36],

	MIN_BET: 10,
	MAX_BET: 500,

	getColor(number: number): 'red' | 'black' | 'green' {
		if (number === 0 || number === 37) return 'green';
		return ROULETTE_CONFIG.RED_NUMBERS.includes(number) ? 'red' : 'black';
	}
};
