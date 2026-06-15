import { emojis } from '../../utils/emojis';

export class GameTrackerMessageBuilder {
	/**
	 * Construit le message de suivi de partie pour les JOUEURS (Groupé par camp, rôles visibles, pseudos masqués si vivants)
	 */
	public static buildPlayerTrackerMessage(mjId: string, players: TrackerPlayer[]): string {
		const lines: string[] = [];
		const totalAlive = players.filter((p) => p.isAlive).length;

		const allMentions = players.map((p) => `<@${p.discordId}>`).join(' ; ');

		// 1. EN-TÊTE DU MESSAGE
		lines.push(`## __Chasse aux Sorcières de Nistrium__`);
		lines.push(`${emojis.crown} **Maître du Jeu** : <@${mjId}>`);
		lines.push(`${emojis.alive} **Joueurs en vie** (${totalAlive}/${players.length}) : ${allMentions}`);
		lines.push('');

		// 2. GROUPEMENT ET AFFICHAGE PAR CAMP
		const campKeys = Array.from(new Set(players.map((p) => p.campKey)));

		for (const key of campKeys) {
			const campPlayers = players.filter((p) => p.campKey === key);
			const campName = campPlayers[0].campName;
			const campAlive = campPlayers.filter((p) => p.isAlive).length;

			lines.push(`### ━━ ${campName} (${campAlive} / ${campPlayers.length}) ━━`);

			campPlayers.forEach((player, index) => {
				const num = String(index + 1).padStart(2, '0');
				const statusEmoji = player.isAlive ? emojis.alive : emojis.dead;

				if (player.isAlive) {
					if (player.isRevealed) {
						// Cas où le joueur est en vie mais son rôle est publiquement connu (ex: Capitaine/Maire)
						lines.push(`${num}. ${statusEmoji} ${player.roleName} — <@${player.discordId}>`);
					} else {
						// Cas normal : On sait que le rôle est en jeu, mais on ne sait pas qui le possède
						lines.push(`${num}. ${statusEmoji} ${player.roleName}`);
					}
				} else {
					// Le joueur est mort : On barre le rôle et on affiche son identité
					lines.push(`${num}. ${statusEmoji} ~~${player.roleName}~~ — <@${player.discordId}>`);
				}
			});
			lines.push('');
		}

		return lines.join('\n');
	}

	/**
	 * Construit le message de suivi de partie pour le MJ (Groupé par camp, tout est visible)
	 */
	public static buildMJTrackerMessage(mjId: string, players: TrackerPlayer[]): string {
		const lines: string[] = [];
		const totalAlive = players.filter((p) => p.isAlive).length;

		const allMentions = players.map((p) => `<@${p.discordId}>`).join(' ; ');

		// 1. EN-TÊTE DU MESSAGE
		lines.push(`## MAÎTRE DU JEU (MJ)`);
		lines.push(`${emojis.crown} **Maître du Jeu** : <@${mjId}>`);
		lines.push(`${emojis.alive} **Joueurs en vie** (${totalAlive}/${players.length}) : ${allMentions}`);
		lines.push('');

		// 2. GROUPEMENT ET AFFICHAGE PAR CAMP
		const campKeys = Array.from(new Set(players.map((p) => p.campKey)));

		for (const key of campKeys) {
			const campPlayers = players.filter((p) => p.campKey === key);
			const campName = campPlayers[0].campName;
			const campAlive = campPlayers.filter((p) => p.isAlive).length;

			lines.push(`### ━━ ${campName} (${campAlive} / ${campPlayers.length}) ━━`);

			campPlayers.forEach((player, index) => {
				const num = String(index + 1).padStart(2, '0');
				const statusEmoji = player.isAlive ? emojis.alive : emojis.dead;

				// Indicateur pour que le MJ sache si les joueurs voient actuellement le pseudo (🔓) ou pas (🔒)
				const revealIndicator = !player.isAlive || player.isRevealed ? '🔓' : '🔒';

				if (player.isAlive) {
					lines.push(`${num}. ${statusEmoji} ${player.roleName} — <@${player.discordId}> ${revealIndicator}`);
				} else {
					lines.push(`${num}. ${statusEmoji} ~~${player.roleName}~~ — <@${player.discordId}> ${revealIndicator}`);
				}
			});
			lines.push('');
		}

		return lines.join('\n');
	}
}

export interface TrackerPlayer {
	discordId: string;
	roleName: string;
	campKey: string; // ex: 'witch', 'village'
	campName: string; // ex: 'Sorcières', 'Villageois'
	isAlive: boolean;
	isRevealed: boolean; // true si le rôle doit être visible par tout le monde (ex: joueur mort, ou reveal public)
}
