import {
	EmbedBuilder,
	ActionRowBuilder,
	StringSelectMenuBuilder,
	ButtonBuilder,
	ButtonStyle,
	ContainerBuilder,
	TextDisplayBuilder,
	MessageFlags,
	MediaGalleryBuilder,
	MediaGalleryItemBuilder
} from 'discord.js';
import { RouletteGame, RouletteBet } from '../models/RouletteGame.interface';
import { emojis } from '../utils/emojis';
import { colors } from '../utils/customColors';
import { BET_OPTIONS, BetType } from '../utils/betLabels';

export class RouletteMessageBuilder {
	/**
	 * Builder principal : retourne le payload COMPLET du message
	 * en fonction de l'état de la partie.
	 */
	public static buildGameMessage(game: RouletteGame, result?: number, winners: any[] = [], showReplay: boolean = true): any {
		const gif = `${process.env.BASE_URL}/assets/casino/roulette/`;

		// --- PHASE 1 : ATTENTE DES MISES (LOBBY) ---
		if (game.status === 'betting') {
			const discordTimestamp = Math.floor(game.endsAt / 1000);
			const timeText = `Le tirage commence <t:${discordTimestamp}:R>`;

			const embed = new EmbedBuilder()
				.setTitle(`${emojis.yellowcheck} La Roulette`)
				.setColor(colors.goldCasino)
				.setDescription(`**Faites vos jeux !**\n${timeText}\n\n${this.formatBets(game.bets)}`);

			return {
				embeds: [embed],
				components: this.buildLobbyComponents()
			};
		}

		// --- PHASE 2 : ANIMATION (GIF) ---
		else if (game.status === 'spinning' && result !== undefined) {
			const embed = new EmbedBuilder()
				.setTitle(`${emojis.yellowcheck} La Roulette`)
				.setColor(colors.goldCasino)
				.setDescription(`*La roue tourne...*\n\n`)
				.setImage(`${gif}${result}.gif`);

			return {
				embeds: [embed],
				components: []
			};
		}

		// --- PHASE 3 : RÉSULTAT FINAL (COMPONENTS V2) ---
		else if (game.status === 'finished' && result !== undefined) {
			const finalColor = winners.length > 0 ? colors.success : colors.fail;
			const titleIcon = winners.length === 0 ? emojis.redcheck : emojis.greencheck;

			const descriptionText = `### ${titleIcon} La Roulette\n__Résultat__ : \`${result}\`\n\n${this.formatWinners(winners)}`;

			const container = new ContainerBuilder().setAccentColor(finalColor);

			// Texte principal
			const textDisplay = new TextDisplayBuilder().setContent(descriptionText);
			container.addTextDisplayComponents(textDisplay);

			// Image résultat
			const media = new MediaGalleryBuilder().addItems(new MediaGalleryItemBuilder().setURL(`${gif}${result}_still.png`));
			container.addMediaGalleryComponents(media);

			const components: any[] = [container.toJSON()];

			// On ajoute le bouton que si showReplay est true
			if (showReplay) {
				const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
					new ButtonBuilder().setCustomId('roulette:button:playAgain').setLabel('Rejouer').setStyle(ButtonStyle.Primary)
				);
				components.push(row.toJSON());
			}

			return {
				flags: MessageFlags.IsComponentsV2,
				components,
				embeds: []
			};
		}

		return { embeds: [] };
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
	 * Construit les composants interactifs du lobby de la roulette.
	 * Génère un menu de sélection dynamique et un bouton d'aide.
	 */
	public static buildLobbyComponents(): ActionRowBuilder<StringSelectMenuBuilder | ButtonBuilder>[] {
		// 1. Préparation des options (Typage explicite pour autoriser le bouton de reset)
		const options: { label: string; value: string; description: string }[] = Object.entries(BET_OPTIONS).map(([value, option]) => ({
			label: option.label,
			value,
			description: option.description
		}));

		// 2. Ajout de l'option de secours au début pour débloquer le sélecteur Discord
		options.unshift({
			label: 'Rafraîchir la sélection',
			value: 'reset',
			description: 'Réinitialise le menu si vous êtes bloqué sur un choix.'
		});

		// 3. Création du menu de sélection
		const selectMenu = new StringSelectMenuBuilder()
			.setCustomId('roulette:select:bet')
			.setPlaceholder('Choisissez ce sur quoi vous voulez miser...')
			.addOptions(options);

		// 4. Création du bouton d'aide
		const helpButton = new ButtonBuilder().setCustomId('roulette:help').setLabel('❔ Help').setStyle(ButtonStyle.Secondary);

		// 5. Retourne les composants organisés en lignes (ActionRows)
		return [
			new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(selectMenu),
			new ActionRowBuilder<ButtonBuilder>().addComponents(helpButton)
		];
	}

	/**
	 * Construit les composants de fin de partie.
	 * Affiche un bouton "Rejouer" pour permettre de relancer rapidement un lobby.
	 */
	public static buildFinishedComponents(): ButtonBuilder[] {
		return [new ButtonBuilder().setCustomId('roulette:button:playAgain').setLabel('Rejouer').setStyle(ButtonStyle.Primary)];
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
