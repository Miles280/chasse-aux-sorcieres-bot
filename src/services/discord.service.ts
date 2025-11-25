import { Guild, GuildMember } from 'discord.js';

const STAFF_ROLES = [process.env.MJ_ROLE!, process.env.DEV_ROLE!, process.env.ADMIN_ROLE!];

export class DiscordService {
	constructor() {}

	/**
	 * Récupère un membre du serveur par son ID Discord.
	 * - Cherche d'abord dans le cache.
	 * - Sinon, tente un fetch depuis l'API Discord.
	 * - Retourne null si impossible.
	 */
	async fetchMember(guild: Guild | null | undefined, discordId: string): Promise<GuildMember | null> {
		if (!guild) return null; // Sécurité si la commande n'a pas de guild

		// Cherche dans le cache ou fetch depuis l'API
		const cached = guild.members.cache.get(discordId);
		if (cached) return cached;

		try {
			return await guild.members.fetch(discordId);
		} catch {
			return null; // Retourne null si fetch échoue
		}
	}

	/**
	 * Récupère un membre ou renvoie une erreur embed formatée pour Discord.
	 */
	async fetchMemberOrReply(
		guild: Guild | null | undefined,
		discordId: string,
		interaction: any, // Interaction ou CommandInteraction
		errorMessage = 'Impossible de trouver ce membre sur le serveur.'
	): Promise<GuildMember | null> {
		const member = await this.fetchMember(guild, discordId);
		if (!member) {
			await interaction.reply({ content: errorMessage, flags: 64 }); // Ephemeral
			return null;
		}
		return member;
	}

	hasStaffRole(member: GuildMember): boolean {
		return member.roles.cache.some((role) => STAFF_ROLES.includes(role.id));
	}
}
