export type InscriptionAction = 'join' | 'leave' | 'spectate';
export type GameState = 'opened' | 'closed' | 'started';

export interface InscriptionInteractionContext {
	action: InscriptionAction;
	state: GameState;
	gameId: string;
}
