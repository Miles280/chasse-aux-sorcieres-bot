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
	first: {
		label: '1ère colonne',
		description: 'Miser sur la première colonne (x3)',
		multiplier: 3,
		isWin: (n: number) => n % 3 === 1
	},
	second: {
		label: '2ème colonne',
		description: 'Miser sur la deuxième colonne (x3)',
		multiplier: 3,
		isWin: (n: number) => n % 3 === 2
	},
	third: {
		label: '3ème colonne',
		description: 'Miser sur la troisième colonne (x3)',
		multiplier: 3,
		isWin: (n: number) => n % 3 === 0
	},
	firstDozen: {
		label: '1-12',
		description: 'Miser sur les numéros de 1 à 12 (x3)',
		multiplier: 3,
		isWin: (n: number) => n >= 1 && n <= 12
	},
	secondDozen: {
		label: '13-24',
		description: 'Miser sur les numéros de 13 à 24 (x3)',
		multiplier: 3,
		isWin: (n: number) => n >= 13 && n <= 24
	},
	thirdDozen: {
		label: '25-36',
		description: 'Miser sur les numéros de 25 à 36 (x3)',
		multiplier: 3,
		isWin: (n: number) => n >= 25 && n <= 36
	},
	number: {
		label: 'Numéro précis',
		description: 'Miser sur un seul numéro précis (x36)',
		multiplier: 36,
		isWin: (n: number, _color: string, betNumber?: number) => betNumber === n
	}
} as const;

export type BetType = keyof typeof BET_OPTIONS;
