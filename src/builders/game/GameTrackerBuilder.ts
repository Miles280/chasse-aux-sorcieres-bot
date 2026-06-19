import { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import { emojis } from '../../utils/emojis';
import { colors } from '../../utils/customColors';
import { GameData } from '../../models/game/Game.interface';

export class GameTrackerMessageBuilder {
	private static readonly CAMP_ORDER: Record<string, { name: string; emoji: string }> = {
		witch: { name: 'Sorcières', emoji: emojis.witch },
		villagers: { name: 'Villageois', emoji: emojis.villagers },
		independent: { name: 'Indépendants', emoji: emojis.independent }
	};

	public static buildPlayerTrackerMessage(game: GameData): string {
		const lines: string[] = [];
		const activePlayers = game.gamePlayers?.filter((p) => !p.isSpectator) || [];

		const alivePlayers = activePlayers.filter((p) => p.isAlive);
		const allMentionsAlivePlayers = alivePlayers.map((p) => `<@${p.user.discordId}>`).join(' ; ');

		// On récupère la transition actuelle (fallback sur 'night' si la phase est inconnue au lancement)
		const currentStep = game.currentStep || 'night';

		// Traduction simple pour l'affichage de la phase actuelle dans l'embed
		const phaseNames: Record<string, string> = { night: 'Nuit 🌙', dawn: 'Aube 🌅', day: 'Jour ☀️', dusk: 'Crépuscule 🌇' };

		// 1. EN-TÊTE
		lines.push(`# __Chasse aux Sorcières de Nistrium__`);
		lines.push(`${emojis.crown} **Maître du Jeu** : <@${game.gameMaster.discordId}>`);
		lines.push(`📅 **Temps actuel** : Jour ${game.dayNumber || 1} — Phase : \`${phaseNames[currentStep] || currentStep}\``);
		lines.push('');
		lines.push(
			`${emojis.alive} **Joueurs en vie** (${activePlayers.filter((p) => p.isAlive).length}/${activePlayers.length}) : ${allMentionsAlivePlayers}`
		);
		lines.push('');

		// 2. GROUPEMENT PAR ORDRE FIXE
		let globalIndex = 1;

		for (const [campKey, config] of Object.entries(this.CAMP_ORDER)) {
			const campPlayers = activePlayers.filter((p) => p.trueRole?.camp === campKey);
			if (campPlayers.length === 0) continue;

			const aliveCount = campPlayers.filter((p) => p.isAlive).length;
			lines.push(`## ${config.emoji} ${config.name} (${aliveCount}/${campPlayers.length}) :`);

			campPlayers.forEach((player) => {
				const num = String(globalIndex).padStart(2, '0');
				globalIndex++;

				const statusEmoji = player.isAlive ? emojis.alive : emojis.dead;
				const roleName = player.trueRole?.name || 'Rôle inconnu';
				const isRevealed = player.revealedRole !== null;

				if (player.isAlive) {
					lines.push(`${num}. ${statusEmoji} ${isRevealed ? `${roleName} — <@${player.user.discordId}>` : roleName}`);
				} else {
					lines.push(`${num}. ${statusEmoji} ~~${roleName}~~ — <@${player.user.discordId}>`);
				}
			});
			lines.push('');
		}

		return lines.join('\n');
	}

	public static buildMJTrackerMessage(game: GameData) {
		const activePlayers = game.gamePlayers?.filter((p) => !p.isSpectator) || [];
		const alivePlayers = activePlayers.filter((p) => p.isAlive);
		const allMentionsAlivePlayers = alivePlayers.map((p) => `<@${p.user.discordId}>`).join(' ; ');

		const lines: string[] = [];

		// --- MAPPING DES PHASES ---
		// Permet de savoir quelle est la prochaine étape + style du bouton
		const phaseTransitions: Record<string, { next: string; label: string; style: ButtonStyle; emoji: string }> = {
			night: { next: 'dawn', label: "Passer à l'Aube", style: ButtonStyle.Primary, emoji: '🌅' },
			dawn: { next: 'day', label: 'Passer au Jour', style: ButtonStyle.Primary, emoji: '☀️' },
			day: { next: 'dusk', label: 'Passer au Crépuscule', style: ButtonStyle.Primary, emoji: '🌇' },
			dusk: { next: 'night', label: 'Passer à la Nuit', style: ButtonStyle.Primary, emoji: '🌙' }
		};

		// On récupère la transition actuelle (fallback sur 'night' si la phase est inconnue au lancement)
		const currentStep = game.currentStep || 'night';
		const transition = phaseTransitions[currentStep] || phaseTransitions['night'];

		// Traduction simple pour l'affichage de la phase actuelle dans l'embed
		const phaseNames: Record<string, string> = { night: 'Nuit 🌙', dawn: 'Aube 🌅', day: 'Jour ☀️', dusk: 'Crépuscule 🌇' };

		// 1. EN-TÊTE (Avec ajout du Jour et de la Phase actuelle)
		lines.push(`${emojis.crown} **Maître du Jeu** : <@${game.gameMaster.discordId}>`);
		lines.push(`📅 **Temps actuel** : Jour ${game.dayNumber || 1} — Phase : \`${phaseNames[currentStep] || currentStep}\``);
		lines.push('');
		lines.push(`${emojis.alive} **Joueurs en vie** (${alivePlayers.length}/${activePlayers.length}) : ${allMentionsAlivePlayers}`);
		lines.push('');

		let globalIndex = 1;

		// 2. BOUCLE DES CAMPS
		for (const [campKey, config] of Object.entries(this.CAMP_ORDER)) {
			const campPlayers = activePlayers.filter((p) => p.trueRole?.camp === campKey);
			if (campPlayers.length === 0) continue;

			const aliveCount = campPlayers.filter((p) => p.isAlive).length;

			lines.push(`${config.emoji} **__${config.name}__ (${aliveCount}/${campPlayers.length}) :**`);

			campPlayers.forEach((player) => {
				const num = String(globalIndex).padStart(2, '0');
				globalIndex++;

				const statusEmoji = player.isAlive ? emojis.alive : emojis.dead;
				const roleText = player.isAlive ? player.trueRole?.name : `~~${player.trueRole?.name}~~`;

				lines.push(`${num}. ${statusEmoji} ${roleText} — <@${player.user.discordId}>`);
			});

			lines.push('');
		}

		// 3. CRÉATION DE L'EMBED
		const embed = new EmbedBuilder()
			.setTitle(`${emojis.purplecheck} __PANNEAU DE CONTRÔLE__`)
			.setColor(colors.witch)
			.setDescription(lines.join('\n'));

		// 4. CRÉATION DU BOUTON INTERACTIF
		const phaseButton = new ButtonBuilder()
			.setCustomId(`change-phase:button:${game.id}:${transition.next}`)
			.setLabel(transition.label)
			.setStyle(transition.style)
			.setEmoji(transition.emoji);

		const row = new ActionRowBuilder<ButtonBuilder>().addComponents(phaseButton);

		// On retourne la structure complète attendue par Discord
		return {
			embeds: [embed],
			components: [row]
		};
	}
}
