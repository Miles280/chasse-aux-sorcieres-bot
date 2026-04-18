export interface ServerConfig {
	id?: number;
	discordServerId: string;
	mjRoleId?: string;
	playerRoleId?: string;
	deadPlayerRoleId?: string;
	spectatorRoleId?: string;
	inscriptionVoiceChannelId?: string;
	gameVoiceChannelId?: string;
	deadVoiceChannelId?: string;
	inscriptionChannelId?: string;
	gameMjChannelId?: string;
	gameCategoryId?: string;
	gamePrivateCategoryId?: string;
}
