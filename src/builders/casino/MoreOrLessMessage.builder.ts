import {
	ActionRowBuilder,
	ButtonBuilder,
	ButtonStyle,
	ContainerBuilder,
	TextDisplayBuilder,
	MediaGalleryBuilder,
	MediaGalleryItemBuilder,
	MessageFlags,
	ThumbnailBuilder,
	SectionBuilder
} from 'discord.js';
import { MoreOrLessGame, Card } from '../../models/casino/MoreOrLessGame.interface';
import { emojis } from '../../utils/emojis';
import { colors } from '../../utils/customColors';

export class MoreOrLessMessageBuilder {
	/**
	 * Construit le message principal de la partie en cours
	 * Affiche :
	 * - état actuel du jeu
	 * - dernier tour joué (si existant)
	 * - joueur dont c'est le tour
	 * - carte actuelle
	 * - vies restantes
	 * - mise en jeu
	 */
	public static buildGameMessage(game: MoreOrLessGame): any {
		const container = this.createContainer(colors.goldCasino);

		const section = new SectionBuilder();

		let content = `### ${emojis.yellowcheck} Plus ou Moins\n`;

		// Affiche le dernier tour joué si disponible
		if (game.lastTurnHistory) {
			content += `${this.renderLastTurn(game)}\n\n`;
		}

		// Indique le joueur actif ou le bot
		content += game.currentTurnId === 'bot' ? `**C'est à mon tour...**\n` : `**C'est à ton tour <@${game.currentTurnId}> !**\n`;

		// Timer du tour
		content += `-# ${this.getTimeRemaining(game)}\n`;

		// Carte actuelle visible
		content += `\n> **Valeur actuelle :** \`${game.currentCard.value}\`\n\n`;

		// Affichage des joueurs + vies
		content += `**${this.getPlayerName(game.player1.id)}** ${this.renderLives(game.player1.lives, game.totalLives)}    VS    `;
		content += `**${this.getPlayerName(game.player2.id)}** ${this.renderLives(game.player2.lives, game.totalLives)}\n`;

		// Mise en jeu
		content += `-# Mise en jeu : ${game.bet} ${emojis.rubies}`;

		section.addTextDisplayComponents(new TextDisplayBuilder().setContent(content));

		// Image de la carte actuelle en thumbnail
		section.setThumbnailAccessory(new ThumbnailBuilder().setURL(game.currentCard.image).setDescription(`Carte: ${game.currentCard.value}`));

		container.addSectionComponents(section);

		return this.buildResponse(container, this.buildActionRows(false, game.messageId));
	}

	/**
	 * Affiche le résultat d'un tour (choix + carte tirée + succès/échec)
	 */
	public static buildRevealMessage(playerId: string, choice: 'more' | 'less', card: Card, success: boolean): any {
		const container = this.createContainer(success ? colors.success : colors.fail);

		const choiceText = choice === 'more' ? 'Plus ↑' : 'Moins ↓';
		const resultText = success ? '**Bonne réponse !**' : '**Mauvaise réponse...**';

		const content =
			`### ${success ? emojis.greencheck : emojis.redcheck} ${resultText}\n` +
			`**${this.getPlayerName(playerId)}** a choisi **${choiceText}**\n` +
			`La carte est...`;

		container.addTextDisplayComponents(new TextDisplayBuilder().setContent(content));

		// Affichage de la carte tirée
		container.addMediaGalleryComponents(new MediaGalleryBuilder().addItems(new MediaGalleryItemBuilder().setURL(card.image)));

		return this.buildResponse(container);
	}

	/**
	 * Message final de fin de partie
	 * Affiche :
	 * - vainqueur / perdant
	 * - gain ou perte
	 * - statistiques de la partie
	 */
	public static buildEndMessage(game: MoreOrLessGame, winnerId: string, loserId: string): any {
		const container = this.createContainer(winnerId === 'bot' ? colors.fail : colors.success);

		const winner = this.getPlayerName(winnerId);
		const loser = this.getPlayerName(loserId);

		const winnerData = game.player1.id === winnerId ? game.player1 : game.player2;

		const remainingLives = winnerData.lives;

		const playedCards = game.totalCards! - game.remainingCards!;

		let content = `### ${winnerId === 'bot' ? emojis.redcheck : emojis.greencheck} Partie terminée\n`;

		content += `${emojis.crown} **Vainqueur :** ${winner} (\`+${game.bet}\` ${emojis.rubies})\n`;
		content += `${emojis.dead} **Perdant :** ${loser} (\`-${game.bet}\` ${emojis.rubies})\n\n`;

		content += `🃏 ${playedCards} carte${playedCards > 1 ? 's' : ''} jouée${playedCards > 1 ? 's' : ''}\n`;
		content += `${emojis.alive} ${remainingLives} ${remainingLives > 1 ? 'vies' : 'vie'} restante${remainingLives > 1 ? 's' : ''}`;

		container.addTextDisplayComponents(new TextDisplayBuilder().setContent(content));

		// Bouton replay / rechallenge
		const isDuel = game.player2.id !== 'bot';

		const replayButton = new ActionRowBuilder<ButtonBuilder>().addComponents(
			new ButtonBuilder()
				.setCustomId(
					isDuel
						? `mol:rechallenge:${game.bet}:${game.totalLives}:${game.player1.id}:${game.player2.id}`
						: `mol:replay:${game.bet}:${game.totalLives}:${game.player1.id}`
				)
				.setLabel('Rejouer')
				.setStyle(ButtonStyle.Success)
		);

		return this.buildResponse(container, [replayButton.toJSON()]);
	}

	/**
	 * Message affiché lors d'un défi entre deux joueurs
	 */
	public static buildChallengeMessage(game: MoreOrLessGame): any {
		const container = this.createContainer(colors.goldCasino);

		const expire = Math.floor((Date.now() + 60000) / 1000);

		const content =
			`### ${emojis.yellowcheck} Nouveau défi\n` +
			`**<@${game.player1.id}>** cherche un adversaire\n\n` +
			`> Mise : \`${game.bet}\` ${emojis.rubies}\n` +
			`> Vies : \`${game.totalLives}\` ${emojis.alive}\n\n` +
			`<@${game.player2.id}>, acceptes-tu ?\n` +
			`-# expire <t:${expire}:R>`;

		container.addTextDisplayComponents(new TextDisplayBuilder().setContent(content));

		return this.buildResponse(container, this.buildChallengeComponents(game.messageId));
	}

	/**
	 * Message affiché au lancement de la partie
	 * Montre la première carte tirée
	 */
	public static buildInitialDrawMessage(game: MoreOrLessGame): any {
		const container = this.createContainer(colors.goldCasino);

		const content =
			`### ${emojis.yellowcheck} Début de la partie\n` +
			`Première carte tirée\n` +
			`**Valeur :** \`${game.currentCard.value}\`\n\n` +
			`*Préparation du plateau...*`;

		container.addTextDisplayComponents(new TextDisplayBuilder().setContent(content));

		container.addMediaGalleryComponents(new MediaGalleryBuilder().addItems(new MediaGalleryItemBuilder().setURL(game.currentCard.image)));

		return this.buildResponse(container);
	}

	/**
	 * Boutons pendant la partie :
	 * - More / Less
	 */
	private static buildActionRows(disabled: boolean, messageId: string) {
		return [
			new ActionRowBuilder<ButtonBuilder>()
				.addComponents(
					new ButtonBuilder().setCustomId(`mol:more:${messageId}`).setLabel('↑ Plus').setStyle(ButtonStyle.Primary).setDisabled(disabled),

					new ButtonBuilder().setCustomId(`mol:less:${messageId}`).setLabel('↓ Moins').setStyle(ButtonStyle.Primary).setDisabled(disabled)
				)
				.toJSON()
		];
	}

	/**
	 * Boutons du challenge (accept / decline)
	 */
	public static buildChallengeComponents(messageId: string) {
		return [
			new ActionRowBuilder<ButtonBuilder>()
				.addComponents(
					new ButtonBuilder().setCustomId(`mol:accept:${messageId}`).setLabel('Accepter').setStyle(ButtonStyle.Success),

					new ButtonBuilder().setCustomId(`mol:decline:${messageId}`).setLabel('Refuser').setStyle(ButtonStyle.Danger)
				)
				.toJSON()
		];
	}

	/**
	 * Crée un container Discord avec couleur
	 */
	private static createContainer(color: number) {
		return new ContainerBuilder().setAccentColor(color);
	}

	/**
	 * Wrapper de réponse Discord (format Components V2)
	 */
	private static buildResponse(container: ContainerBuilder, components: any[] = []) {
		return {
			flags: MessageFlags.IsComponentsV2,
			components: [container.toJSON(), ...components],
			embeds: []
		};
	}

	/**
	 * Affiche un utilisateur (bot ou joueur)
	 */
	private static getPlayerName(id: string) {
		return id === 'bot' ? `<@${process.env.BOT_ID}>` : `<@${id}>`;
	}

	/**
	 * Affiche les vies restantes sous forme d'icônes
	 */
	private static renderLives(lives: number, total: number) {
		return `${emojis.alive.repeat(lives)}${emojis.dead.repeat(total - lives)}`;
	}

	/**
	 * Résume le dernier tour joué
	 */
	private static renderLastTurn(game: MoreOrLessGame) {
		const h = game.lastTurnHistory!;
		const icon = h.success ? emojis.check : emojis.uncheck;
		const choice = h.choice === 'more' ? 'Plus' : 'Moins';

		return `${icon} **${this.getPlayerName(h.playerId)}** → ${choice} sur \`${h.previousValue}\` → \`${h.newValue}\``;
	}

	/**
	 * Retourne le temps restant avant expiration du tour
	 */
	private static getTimeRemaining(game: MoreOrLessGame) {
		if (!game.expiresAt) return '';
		return `Fin du tour <t:${Math.floor(game.expiresAt / 1000)}:R>`;
	}
}
