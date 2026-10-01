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

		const currentStep = game.currentStep || 'night';
		const phaseNames: Record<string, string> = { night: 'Nuit 🌙', dawn: 'Aube 🌅', day: 'Jour ☀️', dusk: 'Crépuscule 🌇' };

		lines.push(`# __Chasse aux Sorcières de Nistrium__`);
		lines.push(`${emojis.crown} **Maître du Jeu** : <@${game.gameMaster.discordId}>`);
		lines.push(`📅 **Temps actuel** : Tour ${game.dayNumber} — Phase : \`${phaseNames[currentStep] || currentStep}\``);
		lines.push('');
		lines.push(`${emojis.alive} **Joueurs en vie** (${alivePlayers.length}/${activePlayers.length}) : ${allMentionsAlivePlayers}`);
		lines.push('');

		interface RoleSlot {
			camp: string;
			roleName: string;
			occupants: Array<{
				player: (typeof activePlayers)[0];
				isAlive: boolean;
			}>;
		}

		const displaySlots: RoleSlot[] = activePlayers.map((p) => ({
			camp: p.trueRole?.camp!,
			roleName: p.trueRole?.name!,
			occupants: []
		}));

		// On assigne chaque joueur révélé (vrai ou faux rôle) à son slot de rôle correspondant
		for (const player of activePlayers) {
			if (player.revealedRole !== null) {
				const targetRoleName = player.revealedRole.name;
				let slot = displaySlots.find((s) => s.roleName === targetRoleName);

				if (!slot) {
					slot = {
						camp: player.revealedRole.camp!,
						roleName: targetRoleName,
						occupants: []
					};
					displaySlots.push(slot);
				}

				slot.occupants.push({
					player,
					isAlive: player.isAlive
				});
			}
		}

		let globalIndex = 1;

		for (const [campKey, config] of Object.entries(this.CAMP_ORDER)) {
			const campSlots = displaySlots.filter((s) => s.camp === campKey);
			if (campSlots.length === 0) continue;

			const apparentAliveCount = campSlots.filter((slot) => {
				return slot.occupants.length === 0 || slot.occupants.some((o) => o.isAlive);
			}).length;

			lines.push(`## ${config.emoji} ${config.name} (${apparentAliveCount}/${campSlots.length}) :`);

			campSlots.forEach((slot) => {
				const num = String(globalIndex).padStart(2, '0');
				globalIndex++;

				// Le slot est considéré mort si tous ses occupants le sont
				const hasDeadOccupants = slot.occupants.length > 0 && slot.occupants.every((o) => !o.isAlive);
				const statusEmoji = hasDeadOccupants ? emojis.dead : emojis.alive;

				if (slot.occupants.length === 0) {
					// Personne n'est révélé sur ce slot, il reste anonyme
					lines.push(`${num}. ${statusEmoji} ${slot.roleName}`);
				} else {
					// Un ou plusieurs joueurs occupent ce rôle (ex: le vrai + un faux)
					const occupantsText = slot.occupants.map((o) => `<@${o.player.user.discordId}>`).join(' ; ');
					lines.push(`${num}. ${statusEmoji} ${slot.roleName} — ${occupantsText}`);
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
		lines.push(`📅 **Temps actuel** : Tour ${game.dayNumber} — Phase : \`${phaseNames[currentStep] || currentStep}\``);
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
