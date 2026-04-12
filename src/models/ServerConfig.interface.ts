export interface ServerConfig {
	id?: number;
	discordServerId: string;
	mjRoleId?: string | null;
	inscriptionChannelId?: string | null;
	gameCategoryId?: string | null;
	gameMjChannelId?: string | null;
	gamePrivateCategoryId?: string | null;
	playerRoleId?: string | null;
	deadPlayerRoleId?: string | null;
}
