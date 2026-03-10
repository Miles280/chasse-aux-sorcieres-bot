export const BET_OPTIONS = {
	red: {
		label: 'Rouge',
		description: 'Miser sur la couleur rouge (x2)',
		multiplier: 2,
		isWin: (_n: number, color: string) => color === 'red'
	},
	black: {
		label: 'Noir',
		description: 'Miser sur la couleur noire (x2)',
		multiplier: 2,
		isWin: (_n: number, color: string) => color === 'black'
	},
	even: {
		label: 'Pair',
		description: 'Miser sur tous les nombres pairs (x2)',
		multiplier: 2,
		isWin: (n: number) => n !== 0 && n % 2 === 0
	},
	odd: {
		label: 'Impair',
		description: 'Miser sur tous les nombres impairs (x2)',
		multiplier: 2,
		isWin: (n: number) => n !== 0 && n % 2 !== 0
	},
	low: {
		label: '1-18',
		description: 'Miser sur les numéros de 1 à 18 (x2)',
		multiplier: 2,
		isWin: (n: number) => n >= 1 && n <= 18
	},
	high: {
		label: '19-36',
		description: 'Miser sur les numéros de 19 à 36 (x2)',
		multiplier: 2,
		isWin: (n: number) => n >= 19 && n <= 36
	},
	number: {
		label: 'Numéro précis',
		description: 'Miser sur un seul numéro précis (x36)',
		multiplier: 36,
		isWin: (n: number, _color: string, betNumber?: number) => betNumber === n
	}
} as const;

export type BetType = keyof typeof BET_OPTIONS;
