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
import { MoreOrLessGame, Card } from '../models/MoreOrLessGame.interface';
import { emojis } from '../utils/emojis';
import { colors } from '../utils/customColors';

export class MoreOrLessMessageBuilder {
	/**
	 * Phase de JEU : Container V2 avec Ping en content
	 */
	public static buildGameMessage(game: MoreOrLessGame): any {
		const p1Name = this.getPlayerName(game.player1.id);
		const p2Name = this.getPlayerName(game.player2.id);

		const container = new ContainerBuilder().setAccentColor(colors.goldCasino);

		// 1. On crée la Section (qui remplace notre usage direct du Container pour le contenu)
		const section = new SectionBuilder();

		// 2. On ajoute le texte
		let description = `### ${emojis.yellowcheck} Plus ou Moins\n`;

		if (game.lastTurnHistory) {
			description += `${this.renderLastTurn(game)}\n\n`;
		}

		description += game.currentTurnId === 'bot' ? `**C'est à mon tour...**\n` : `**C'est à ton tour <@${game.currentTurnId}> !**\n`;
		description += `-# ${this.getTimeRemaining(game)}\n`;
		description += `\n> **Valeur actuelle :** \`${game.currentCard.value}\`\n\n`;
		description += `**${p1Name}** ${this.renderLives(game.player1.lives, game.totalLives)}    VS    **${p2Name}** ${this.renderLives(game.player2.lives, game.totalLives)}`;

		section.addTextDisplayComponents(new TextDisplayBuilder().setContent(description));

		// 3. On ajoute le Thumbnail en tant qu'Accessory de la Section
		section.setThumbnailAccessory(
			new ThumbnailBuilder().setURL(game.currentCard.image).setDescription(`Carte actuelle: ${game.currentCard.value}`)
		);

		container.addSectionComponents(section);

		return {
			flags: MessageFlags.IsComponentsV2,
			components: [container.toJSON(), ...this.buildActionRows(game, false)],
			embeds: []
		};
	}

	/**
	 * Phase de REVEAL : Suspense avec image en grand
	 */
	public static buildRevealMessage(playerId: string, choice: 'more' | 'less', newCard: Card, success: boolean): any {
		const playerName = this.getPlayerName(playerId);
		const choiceText = choice === 'more' ? 'Plus ↑' : 'Moins ↓';

		const resultText = success ? '**Bonne réponse !**' : '**Mauvaise réponse...**';

		const container = new ContainerBuilder().setAccentColor(success ? colors.success : colors.fail);

		const text = `### ${success ? emojis.greencheck : emojis.redcheck} ${resultText}\n**${playerName}** a choisi **${choiceText}**\nLa carte est...`;
		container.addTextDisplayComponents(new TextDisplayBuilder().setContent(text));

		const media = new MediaGalleryBuilder().addItems(new MediaGalleryItemBuilder().setURL(newCard.image));
		container.addMediaGalleryComponents(media);

		return {
			flags: MessageFlags.IsComponentsV2,
			components: [container.toJSON()],
			embeds: []
		};
	}

	/**
	 * Phase de FIN : Container Rouge (si bot gagne) ou Vert
	 */
	public static buildEndMessage(game: MoreOrLessGame, winnerId: string, loserId: string): any {
		const winnerName = this.getPlayerName(winnerId);
		const loserName = this.getPlayerName(loserId);

		const isBotWinner = winnerId === 'bot';
		const finalColor = isBotWinner ? colors.fail : colors.success;
		const titleIcon = isBotWinner ? `${emojis.redcheck}` : `${emojis.greencheck}`;

		// Calcul des vies restantes du gagnant
		const winnerData = game.player1.id === winnerId ? game.player1 : game.player2;
		const winnerLives = winnerData.lives;

		const container = new ContainerBuilder().setAccentColor(finalColor);

		let resultText = `### ${titleIcon} Partie Terminée !\n`;
		resultText += `${emojis.crown} **Vainqueur :** ${winnerName} (\`+${game.bet * 2}\` ${emojis.rubies})\n`;
		resultText += `${emojis.dead} **Perdant :** ${loserName}\n\n`;

		const playedCards = game.totalCards! - game.remainingCards!;

		resultText += `🃏 Vous avez tiré **${playedCards}** carte${playedCards > 1 ? 's' : ''}\n`;
		resultText += `${emojis.alive} Il restait **${winnerLives}** ${winnerLives > 1 ? 'vies' : 'vie'} à ${winnerName}`;

		container.addTextDisplayComponents(new TextDisplayBuilder().setContent(resultText));

		return {
			flags: MessageFlags.IsComponentsV2,
			components: [container.toJSON()],
			embeds: []
		};
	}

	/**
	 * Message de DÉFI (V2)
	 */
	public static buildChallengeMessage(game: MoreOrLessGame): any {
		const container = new ContainerBuilder().setAccentColor(colors.goldCasino);

		// On met le ping ici
		const description =
			`🔔 <@${game.player2.id}>\n` +
			`### 🎯 Défi Plus ou Moins\n` +
			`<@${game.player1.id}> te défie !\n\n` +
			`💰 **Mise :** \`${game.bet}\` ${emojis.rubies}\n` +
			`⏳ expire <t:${Math.floor((Date.now() + 60000) / 1000)}:R>`;

		container.addTextDisplayComponents(new TextDisplayBuilder().setContent(description));

		return {
			flags: MessageFlags.IsComponentsV2,
			components: [container.toJSON(), ...this.buildChallengeComponents(game.messageId)],
			embeds: []
		};
	}

	/**
	 * Phase de TIRAGE INITIAL : Affiche la toute première carte en grand
	 */
	public static buildInitialDrawMessage(game: MoreOrLessGame): any {
		const container = new ContainerBuilder().setAccentColor(colors.goldCasino);

		const description =
			`### ${emojis.yellowcheck} Début de la partie !\n` +
			`La première carte a été tirée.\n` +
			`**Valeur :** \`${game.currentCard.value}\`\n\n` +
			`*Préparation du plateau de jeu...*`;

		container.addTextDisplayComponents(new TextDisplayBuilder().setContent(description));

		// On affiche la carte en grand pour le début
		const media = new MediaGalleryBuilder().addItems(new MediaGalleryItemBuilder().setURL(game.currentCard.image));
		container.addMediaGalleryComponents(media);

		return {
			flags: MessageFlags.IsComponentsV2,
			components: [container.toJSON()],
			embeds: []
		};
	}

	/**
	 * Helper pour les boutons (ActionRows)
	 */
	private static buildActionRows(game: MoreOrLessGame, disabled: boolean): any[] {
		const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
			new ButtonBuilder().setCustomId(`mol:more:${game.messageId}`).setLabel('↑ Plus').setStyle(ButtonStyle.Primary).setDisabled(disabled),
			new ButtonBuilder().setCustomId(`mol:less:${game.messageId}`).setLabel('↓ Moins').setStyle(ButtonStyle.Primary).setDisabled(disabled)
		);
		return [row.toJSON()];
	}

	/**
	 * Boutons du défi
	 */
	public static buildChallengeComponents(messageId: string): any[] {
		const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
			new ButtonBuilder().setCustomId(`mol:accept:${messageId}`).setLabel('Accepter').setStyle(ButtonStyle.Success),
			new ButtonBuilder().setCustomId(`mol:decline:${messageId}`).setLabel('Refuser').setStyle(ButtonStyle.Danger)
		);
		return [row.toJSON()];
	}

	// --- HELPERS DE RENDU ---

	private static getPlayerName(id: string): string {
		if (id === 'bot') {
			return `<@${process.env.BOT_ID}>`;
		}
		return `<@${id}>`;
	}

	private static renderLives(lives: number, totalLives: number): string {
		return `${emojis.alive.repeat(lives)}${emojis.dead.repeat(totalLives - lives)}`;
	}

	private static renderLastTurn(game: MoreOrLessGame): string {
		const h = game.lastTurnHistory;
		if (!h) return '';
		const icon = h.success ? `${emojis.check}` : `${emojis.uncheck}`;
		const choiceText = h.choice === 'more' ? 'Plus' : 'Moins';
		return `${icon} **${this.getPlayerName(h.playerId)}** a dit __${choiceText}__ sur le \`${h.previousValue}\` et a pioché un \`${h.newValue}\``;
	}

	private static getTimeRemaining(game: MoreOrLessGame): string | null {
		if (!game.expiresAt) return null;
		const timestamp = Math.floor(game.expiresAt / 1000);
		return `⏳ Fin du tour <t:${timestamp}:R>`;
	}
}
