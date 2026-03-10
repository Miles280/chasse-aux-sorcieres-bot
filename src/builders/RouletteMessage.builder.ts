import { EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder } from 'discord.js';
import { RouletteGame, RouletteBet } from '../models/RouletteGame.interface';
import { emojis } from '../utils/emojis';
import { colors } from '../utils/customColors';
import { BET_OPTIONS, BetType } from '../utils/betLabels';

export class RouletteMessageBuilder {
	/**
	 * Construit l'embed principal de la partie de roulette en fonction du statut de la partie.
	 * Affiche les mises si la partie est en attente, le GIF si elle tourne, ou le résultat final.
	 */
	public static buildGameEmbed(game: RouletteGame, result?: number, winners: any[] = []): EmbedBuilder {
		const embed = new EmbedBuilder().setTitle(`${emojis.yellowcheck} La Roulette`);
		const gif = `${process.env.BASE_URL}/assets/casino/roulette/`;

		// --- PHASE 1 : ATTENTE DES MISES (LOBBY) ---
		if (game.status === 'betting') {
			const discordTimestamp = Math.floor(game.endsAt / 1000);

			const timeText = `Le tirage commence <t:${discordTimestamp}:R>`;

			embed.setColor(colors.goldCasino).setDescription(`**Faites vos jeux !**\n${timeText}\n\n${this.formatBets(game.bets)}`);
		}

		// --- PHASE 2 : ANIMATION (GIF) ---
		else if (game.status === 'spinning' && result !== undefined) {
			embed.setColor(colors.goldCasino).setDescription(`*La roue tourne...*\n\n`).setImage(`${gif}${result}.gif`);
		}

		// --- PHASE 3 : RÉSULTAT FINAL ---
		else if (game.status === 'finished' && result !== undefined) {
			const finalColor = winners.length > 0 ? colors.success : colors.fail;

			embed
				.setColor(finalColor)
				.setImage(`${gif}${result}_still.png`)
				.setTitle(`${winners.length === 0 ? emojis.redcheck : emojis.greencheck} La Roulette`)
				.setDescription(`__Résultat__ : \`${result}\`\n\n` + this.formatWinners(winners));
		}

		return embed;
	}

	/**
	 * Construit un embed affiché lorsque les mises sont fermées
	 * mais que la roue n'a pas encore terminé de tourner.
	 */
	public static buildClosedLobbyEmbed(game: RouletteGame): EmbedBuilder {
		return new EmbedBuilder()
			.setTitle(`${emojis.yellowcheck} La Roulette`)
			.setColor(colors.goldCasino)
			.setDescription(`**Les jeux sont faits !**\n` + `Le tirage a commencé... \n\n` + this.formatBets(game.bets));
	}

	/**
	 * Construit les composants interactifs du lobby (sélecteur de type de mise)
	 * à partir de BET_OPTIONS pour générer dynamiquement les labels et descriptions.
	 */
	public static buildLobbyComponents(): ActionRowBuilder<StringSelectMenuBuilder>[] {
		const selectMenu = new StringSelectMenuBuilder()
			.setCustomId('roulette:select_bet')
			.setPlaceholder('Choisissez ce sur quoi vous voulez miser...')
			.addOptions(
				Object.entries(BET_OPTIONS).map(([value, option]) => ({
					label: option.label,
					value,
					description: option.description
				}))
			);

		return [new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(selectMenu)];
	}

	/**
	 * Embed affiché si la partie est annulée faute de joueurs.
	 */
	public static buildCancelledEmbed(): EmbedBuilder {
		return new EmbedBuilder()
			.setTitle(`${emojis.redcheck} La Roulette`)
			.setColor(colors.fail)
			.setDescription(`**Partie annulée**\n> *Aucun joueur n'a misé sur cette table.*`);
	}

	/**
	 * Formate les mises actuelles par type et par joueur.
	 * Les catégories sont affichées dans l'ordre défini par BET_OPTIONS,
	 * les mises sur les numéros précis sont affichées ensuite, triées croissantes.
	 */
	private static formatBets(bets: RouletteBet[]): string {
		if (bets.length === 0) return '> *Aucune mise pour le moment.*';

		// 1️. Grouper les mises par type et par joueur
		const groupedBets = new Map<string | number, Map<string, number>>();

		for (const bet of bets) {
			if (!groupedBets.has(bet.type)) groupedBets.set(bet.type, new Map());
			const userMap = groupedBets.get(bet.type)!;
			userMap.set(bet.userId, (userMap.get(bet.userId) ?? 0) + bet.amount);
		}

		// 2️. Construire le texte de sortie
		let text = `**Mises effectuées** [${bets.length}] :\n`;

		// 3️. Définir l'ordre des catégories "classiques" (Rouge, Noir, Pair, Impair, etc.)
		const orderedTypes = Object.keys(BET_OPTIONS) as BetType[];

		// Ajouter les mises sur les numéros spécifiques à la fin
		const numberBets = [...groupedBets.keys()].filter((k) => typeof k === 'number').sort((a, b) => Number(a) - Number(b));
		const displayOrder = [...orderedTypes, ...numberBets];

		// 4️. Parcourir les types dans l'ordre défini
		for (const type of displayOrder) {
			const userMap = groupedBets.get(type);
			if (!userMap) continue;

			// Déterminer le label pour l'affichage
			const typeLabel = typeof type === 'number' ? `Numéro ${type}` : BET_OPTIONS[type as BetType].label;

			text += `__${typeLabel}__ :\n> `;

			const userStrings = Array.from(userMap.entries()).map(([userId, totalAmount]) => `<@${userId}> : \`${totalAmount}\` ${emojis.rubies}`);

			text += userStrings.join(', ') + '\n\n';
		}

		return text.trim();
	}

	/**
	 * Formate la liste des gagnants avec leurs gains.
	 * Si aucun gagnant, affiche un message indiquant que la banque rafle tout.
	 */
	private static formatWinners(winners: any[]): string {
		if (winners.length === 0) return `> **Aucun gagnant sur ce tour.**\n*La banque rafle tout !* ||*loser*||`;

		let text = `**Félicitations aux gagnants !**\n`;
		winners.forEach((w) => {
			text += `> ${emojis.crown} <@${w.userId}> remporte **${w.payout}** ${emojis.rubies}\n`;
		});
		return text;
	}
}
