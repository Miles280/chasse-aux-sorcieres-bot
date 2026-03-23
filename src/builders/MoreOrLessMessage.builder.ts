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
	// =========================================================
	// GAME
	// =========================================================

	public static buildGameMessage(game: MoreOrLessGame): any {
		const container = this.createContainer(colors.goldCasino);

		const section = new SectionBuilder();

		let content = `### ${emojis.yellowcheck} Plus ou Moins\n`;

		if (game.lastTurnHistory) {
			content += `${this.renderLastTurn(game)}\n\n`;
		}

		content += game.currentTurnId === 'bot' ? `**C'est à mon tour...**\n` : `**C'est à ton tour <@${game.currentTurnId}> !**\n`;

		content += `-# ${this.getTimeRemaining(game)}\n`;
		content += `\n> **Valeur actuelle :** \`${game.currentCard.value}\`\n\n`;

		content += `**${this.getPlayerName(game.player1.id)}** ${this.renderLives(game.player1.lives, game.totalLives)}    VS    `;
		content += `**${this.getPlayerName(game.player2.id)}** ${this.renderLives(game.player2.lives, game.totalLives)}`;

		section.addTextDisplayComponents(new TextDisplayBuilder().setContent(content));

		section.setThumbnailAccessory(new ThumbnailBuilder().setURL(game.currentCard.image).setDescription(`Carte: ${game.currentCard.value}`));

		container.addSectionComponents(section);

		return this.buildResponse(container, this.buildActionRows(game, false));
	}

	// =========================================================
	// REVEAL
	// =========================================================

	public static buildRevealMessage(playerId: string, choice: 'more' | 'less', card: Card, success: boolean): any {
		const container = this.createContainer(success ? colors.success : colors.fail);

		const choiceText = choice === 'more' ? 'Plus ↑' : 'Moins ↓';
		const resultText = success ? '**Bonne réponse !**' : '**Mauvaise réponse...**';

		const content =
			`### ${success ? emojis.greencheck : emojis.redcheck} ${resultText}\n` +
			`**${this.getPlayerName(playerId)}** a choisi **${choiceText}**\n` +
			`La carte est...`;

		container.addTextDisplayComponents(new TextDisplayBuilder().setContent(content));

		container.addMediaGalleryComponents(new MediaGalleryBuilder().addItems(new MediaGalleryItemBuilder().setURL(card.image)));

		return this.buildResponse(container);
	}

	// =========================================================
	// END
	// =========================================================

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

		return this.buildResponse(container);
	}

	// =========================================================
	// CHALLENGE
	// =========================================================

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

	// =========================================================
	// INITIAL DRAW
	// =========================================================

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

	// =========================================================
	// COMPONENTS
	// =========================================================

	private static buildActionRows(game: MoreOrLessGame, disabled: boolean) {
		return [
			new ActionRowBuilder<ButtonBuilder>()
				.addComponents(
					new ButtonBuilder()
						.setCustomId(`mol:more:${game.messageId}`)
						.setLabel('↑ Plus')
						.setStyle(ButtonStyle.Primary)
						.setDisabled(disabled),
					new ButtonBuilder()
						.setCustomId(`mol:less:${game.messageId}`)
						.setLabel('↓ Moins')
						.setStyle(ButtonStyle.Primary)
						.setDisabled(disabled)
				)
				.toJSON()
		];
	}

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

	// =========================================================
	// HELPERS
	// =========================================================

	private static createContainer(color: number) {
		return new ContainerBuilder().setAccentColor(color);
	}

	private static buildResponse(container: ContainerBuilder, components: any[] = []) {
		return {
			flags: MessageFlags.IsComponentsV2,
			components: [container.toJSON(), ...components],
			embeds: []
		};
	}

	private static getPlayerName(id: string) {
		return id === 'bot' ? `<@${process.env.BOT_ID}>` : `<@${id}>`;
	}

	private static renderLives(lives: number, total: number) {
		return `${emojis.alive.repeat(lives)}${emojis.dead.repeat(total - lives)}`;
	}

	private static renderLastTurn(game: MoreOrLessGame) {
		const h = game.lastTurnHistory!;
		const icon = h.success ? emojis.check : emojis.uncheck;
		const choice = h.choice === 'more' ? 'Plus' : 'Moins';

		return `${icon} **${this.getPlayerName(h.playerId)}** → ${choice} sur \`${h.previousValue}\` → \`${h.newValue}\``;
	}

	private static getTimeRemaining(game: MoreOrLessGame) {
		if (!game.expiresAt) return '';
		return `⏳ <t:${Math.floor(game.expiresAt / 1000)}:R>`;
	}
}
