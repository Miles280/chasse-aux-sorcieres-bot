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

	/**
	 * Vérifie si un membre a un rôle spécifique.
	 * @param member Le membre à vérifier
	 * @param roleId L'ID du rôle à vérifier
	 * @returns true si le membre possède le rôle, false sinon
	 */
	hasRole(member: GuildMember, roleId: string): boolean {
		return member.roles.cache.has(roleId);
	}

	/**
	 * Vérifie si un membre a l'un des rôles d'une liste.
	 * @param member Le membre à vérifier
	 * @param roleIds Liste des IDs de rôles
	 */
	hasAnyRole(member: GuildMember, roleIds: string[]): boolean {
		return member.roles.cache.some((role) => roleIds.includes(role.id));
	}

	moveMemberToVc = async (guild: Guild, discordId: string, targetChannel: any) => {
		// 1. Essai de récupération du membre
		const member = await guild.members.fetch(discordId).catch((err) => {
			console.error(`❌ Erreur lors du fetch du membre (${discordId}) :`, err);
			return null;
		});

		if (!member) {
			console.error(`⚠️ Membre introuvable sur le serveur Discord avec l'ID : ${discordId}`);
			return;
		}

		// 2. Vérification de la présence dans un salon vocal
		if (!member.voice.channelId) {
			console.log(`ℹ️ ${member.user.tag} (${discordId}) n'est connecté dans AUCUN salon vocal.`);
			return;
		}

		// 3. Vérification si le joueur est déjà dans le bon salon (évite un appel inutile)
		const targetChannelId = typeof targetChannel === 'string' ? targetChannel : targetChannel?.id;
		if (member.voice.channelId === targetChannelId) {
			console.log(`ℹ️ ${member.user.tag} est déjà dans le salon cible.`);
			return;
		}

		// 4. Tentative de déplacement
		try {
			await member.voice.setChannel(targetChannel);
			console.log(`✅ ${member.user.tag} a été déplacé vers ${targetChannelId || 'le salon cible'}.`);
		} catch (e) {
			console.error(`❌ Impossible de move ${member.user.tag} (${discordId}) :`, e);
		}
	};
}
