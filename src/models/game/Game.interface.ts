import { UserInterface } from './../ApiResponse.interface';
import { RoleInterface } from './Role.interface';

/**
 * Interface pour les données d'une partie
 */
export interface GameData {
	id: number;
	gameMaster: UserInterface;
	status: string;
	gameMode: string | null;
	winningCamp: string | null;
	createdAt: string;
	startedAt: string | null;
	finishedAt: string | null;
	currentStep: string;
	dayNumber: number;
	inscriptionMessageId: string | null;
	compoMessageId: string | null;
	publicTrackerMessageId: string | null;
	mjTrackerMessageId: string | null;
	discordChannels: DiscordChannelsInterface;
	gamePlayers: GamePlayerInterface[];
}

export interface GamePlayerInterface {
	id: number;
	user: UserInterface;
	isSpectator: boolean;
	isAlive: boolean;
	trueRole: RoleInterface | null;
	revealedRole: RoleInterface | null;
	discordChannelId: string | null;
}

export interface DiscordChannelsInterface {
	deadVoiceId?: string;
	mainVoiceId?: string;
	rolesForumId?: string;
	debatChannelId?: string;
	votesChannelId?: string;
	witchesChannelId?: string;
	graveyardChannelId?: string;
}

export interface CompoData {
	composition: RoleInterface[];
}

export interface RoleDistribution {
	discordId: string;
	role: RoleInterface;
}

export interface NightDeathPlayer {
	id: number;
	game: {
		id: number;
	};
	user: {
		id: number;
		discordId: string;
	};
	isSpectator: boolean;
	isAlive: boolean;
	trueRole: RoleInterface | null;
	revealedRole: RoleInterface | null;
	gemsWon: number | null;
	discordChannelId: string;
}
