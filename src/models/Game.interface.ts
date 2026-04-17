/**
 * Interface pour les données d'une partie
 */
export interface GameData {
	id: number;
	gameMasterId: string;
	gameMode?: string;
	status?: string;
	inscriptionMessageId?: string;
	compoMessageId?: string;
	publicTrackerMessageId?: string;
	mjTrackerMessageId?: string;
	players: string[];
	spectators: string[];
	createdAt?: string;
	startedAt?: string;
	finishedAt?: string;
	currentStep?: string;
	dayNumber?: number;
	winningCamp?: string;
}

/**
 * Réponse de l'API pour l'inscription/désinscription
 */
export interface InscriptionResponse {
	players: string[];
}
