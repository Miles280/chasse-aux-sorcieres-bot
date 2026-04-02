import { ActionRowBuilder, ButtonBuilder, ButtonStyle, AttachmentBuilder } from 'discord.js';
import { createCanvas, loadImage } from 'canvas';
import { BlackjackGame } from '../models/BlackjackGame.interface';
import { colors } from '../utils/customColors';
import { emojis } from '../utils/emojis';

export class BlackjackMessageBuilder {
	// =========================================================
	// UTILS : CALCUL DU SCORE
	// =========================================================

	private static getCardValue(url: string): number {
		// Extrait le nom du fichier (ex: "8C", "0H", "aceDiamonds") et le met en majuscule
		const filename = url.split('/').pop()?.split('.')[0].toUpperCase() || '';
		if (!filename) return 0;

		const firstChar = filename[0];

		// 'A' couvre "AD", "AS", mais aussi "ACEDIAMONDS"
		if (firstChar === 'A') return 11;
		// 'K','Q','J' couvrent "KD", "KING...", '0' pour le 10 normal de l'API, '1' au cas où le nom serait "10"
		if (['K', 'Q', 'J', '0', '1'].includes(firstChar)) return 10;

		// Pour tous les autres chiffres (2 à 9)
		const val = parseInt(firstChar);
		return isNaN(val) ? 0 : val;
	}

	public static calculateScore(cardUrls: string[], revealAll = true): number {
		let total = 0;
		let aces = 0;

		for (let i = 0; i < cardUrls.length; i++) {
			if (!revealAll && i === 1) continue;

			const val = this.getCardValue(cardUrls[i]);
			if (val === 11) aces++;
			total += val;
		}

		while (total > 21 && aces > 0) {
			total -= 10;
			aces--;
		}
		return total;
	}

	// =========================================================
	// MESSAGE PRINCIPAL
	// =========================================================

	public static async buildGameMessage(game: BlackjackGame) {
		const isFinished = game.status === 'finished';
		const hideDealer = game.status === 'playing';

		const buffer = await this.renderCanvas(game, hideDealer);
		const attachment = new AttachmentBuilder(buffer, { name: 'blackjack.png' });

		const embedColor = isFinished ? (game.result === 'lose' ? colors.fail : colors.success) : colors.goldCasino;

		// 1. Détermination de l'emoji du titre
		let titleEmoji = emojis.yellowcheck;

		if (isFinished) {
			if (game.result === 'win' || game.result === 'blackjack') titleEmoji = emojis.greencheck;
			else if (game.result === 'lose') titleEmoji = emojis.redcheck;
			else titleEmoji = emojis.greencheck; // Égalité
		}

		let statusText = `### ${titleEmoji} Blackjack\n\n`;

		if (isFinished) {
			const messages = {
				win: `Bien joué ! Vous remportez la manche et doublez votre mise.\n`,
				blackjack: `Exceptionnel ! Un Blackjack parfait, vous repartez avec le jackpot.\n`,
				lose: `Dommage, la banque remporte cette main. Retentez votre chance !\n`,
				draw: `Égalité ! Personne ne l'emporte, vous récupérez votre mise.\n`,
				timeout: `Temps écoulé ! Vous avez mis trop de temps à jouer, la banque encaisse votre mise.\n`
			};

			const details = {
				win: `**Gain :** \`+${game.bet * 2}\` ${emojis.rubies}`,
				blackjack: `**Gain :** \`+${Math.floor(game.bet * 2.5)}\` ${emojis.rubies}`,
				lose: `**Perte :** \`-${game.bet}\` ${emojis.rubies}`,
				draw: `**Retour :** \`${game.bet}\` ${emojis.rubies}`,
				timeout: `**Perte :** \`-${game.bet}\` ${emojis.rubies}`
			};

			statusText += `${messages[game.result!]}\n${details[game.result!]}`;
		} else {
			const playerScore = this.calculateScore(game.playerCards);
			const firstCardScore = this.calculateScore([game.dealerCards[0]]);

			statusText += `La partie est en cours. Que souhaitez-vous faire ?\n\n`;
			statusText += `**Votre score :** \`${playerScore}\` | **Banque :** \`${firstCardScore} + ?\`\n`;
			statusText += `**Mise :** ${game.bet} ${emojis.rubies}`;
		}

		// =========================================================
		// GESTION DES BOUTONS (Tirer/Doubler/S'arrêter VS Rejouer)
		// =========================================================
		let actionRows = [];

		if (!isFinished) {
			const row = new ActionRowBuilder<ButtonBuilder>();

			// 1. On ajoute "Tirer" en premier (Action principale)
			row.addComponents(new ButtonBuilder().setCustomId(`bj:hit:${game.messageId}`).setLabel('Tirer').setStyle(ButtonStyle.Primary));

			// 2. On ajoute "Doubler" au milieu (Uniquement au premier tour)
			if (game.playerCards.length === 2) {
				row.addComponents(new ButtonBuilder().setCustomId(`bj:double:${game.messageId}`).setLabel('Doubler').setStyle(ButtonStyle.Success));
			}

			// 3. On ajoute "S'arrêter" en dernier
			row.addComponents(new ButtonBuilder().setCustomId(`bj:stand:${game.messageId}`).setLabel("S'arrêter").setStyle(ButtonStyle.Secondary));

			actionRows.push(row);
		} else {
			// Bouton de fin de partie (Inchangé)
			actionRows.push(
				new ActionRowBuilder<ButtonBuilder>().addComponents(
					new ButtonBuilder().setCustomId(`bj:replay:${game.initialBet}:${game.userId}`).setLabel(`Rejouer`).setStyle(ButtonStyle.Primary)
				)
			);
		}

		return {
			content: `<@${game.userId}>`,
			embeds: [
				{
					description: statusText,
					image: { url: 'attachment://blackjack.png' },
					color: embedColor
				}
			],
			components: actionRows,
			files: [attachment]
		};
	}

	// =========================================================
	// RENDU CANVAS (IMAGE)
	// =========================================================

	private static async renderCanvas(game: BlackjackGame, hideDealerSecond: boolean) {
		const { playerCards, dealerCards, bet } = game;
		const width = 1000;
		const height = 600;
		const canvas = createCanvas(width, height);
		const ctx = canvas.getContext('2d');
		const centerX = width / 2;

		// =========================
		// 🎰 FOND CASINO LUXUEUX
		// =========================
		const gradient = ctx.createRadialGradient(centerX, height / 2, 50, centerX, height / 2, 700);
		gradient.addColorStop(0, '#0a5d1e');
		gradient.addColorStop(0.5, '#063919');
		gradient.addColorStop(1, '#021a0c');
		ctx.fillStyle = gradient;
		ctx.fillRect(0, 0, width, height);

		ctx.save();
		ctx.globalAlpha = 0.05;
		ctx.strokeStyle = '#ffffff';
		ctx.lineWidth = 1;
		const diamondSize = 40;
		for (let y = -diamondSize; y < height + diamondSize; y += diamondSize) {
			for (let x = -diamondSize; x < width + diamondSize; x += diamondSize * 2) {
				const offsetX = (y / diamondSize) % 2 === 0 ? 0 : diamondSize;
				ctx.beginPath();
				ctx.moveTo(x + offsetX, y);
				ctx.lineTo(x + offsetX + diamondSize / 2, y + diamondSize / 2);
				ctx.lineTo(x + offsetX, y + diamondSize);
				ctx.lineTo(x + offsetX - diamondSize / 2, y + diamondSize / 2);
				ctx.closePath();
				ctx.stroke();
			}
		}
		ctx.restore();

		// =========================
		// 🎨 BORDURE ET SÉPARATEUR
		// =========================
		ctx.strokeStyle = '#7f1d1d'; // Rouge foncé
		ctx.lineWidth = 12; // Bordure plus grosse
		ctx.strokeRect(6, 6, width - 12, height - 12);

		// Retour du séparateur central
		const centerGradient = ctx.createLinearGradient(centerX - 2, 0, centerX + 2, 0);
		centerGradient.addColorStop(0, 'rgba(251, 191, 36, 0)');
		centerGradient.addColorStop(0.5, 'rgba(251, 191, 36, 0.5)');
		centerGradient.addColorStop(1, 'rgba(251, 191, 36, 0)');
		ctx.fillStyle = centerGradient;
		ctx.fillRect(centerX - 1, 40, 2, height - 80);

		// =========================
		// 🎴 FONCTION CARTES
		// =========================
		const drawCards = async (cards: string[], targetCenterX: number, y: number, hideSecond: boolean) => {
			const cardW = 144;
			const cardH = 210;
			const spacing = 45;

			const totalWidth = cardW + (cards.length - 1) * spacing;
			const currentStartX = targetCenterX - totalWidth / 2;

			for (let i = 0; i < cards.length; i++) {
				const x = currentStartX + i * spacing;

				ctx.save();
				ctx.translate(x + cardW / 2, y + cardH / 2);
				const angle = (i - (cards.length - 1) / 2) * 0.05;
				ctx.rotate(angle);

				ctx.shadowColor = 'rgba(0,0,0,0.7)';
				ctx.shadowBlur = 15;
				ctx.shadowOffsetX = 3;
				ctx.shadowOffsetY = 6;

				if (hideSecond && i === 1) {
					ctx.fillStyle = '#ffffff';
					ctx.fillRect(-cardW / 2, -cardH / 2, cardW, cardH);

					ctx.fillStyle = '#991b1b';
					ctx.fillRect(-cardW / 2 + 5, -cardH / 2 + 5, cardW - 10, cardH - 10);

					ctx.save();
					ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
					ctx.lineWidth = 2;
					ctx.beginPath();
					ctx.moveTo(0, -cardH / 2 + 25);
					ctx.lineTo(cardW / 2 - 25, 0);
					ctx.lineTo(0, cardH / 2 - 25);
					ctx.lineTo(-cardW / 2 + 25, 0);
					ctx.closePath();
					ctx.stroke();
					ctx.beginPath();
					ctx.arc(0, 0, 16, 0, Math.PI * 2);
					ctx.stroke();
					ctx.restore();
				} else {
					const img = await loadImage(cards[i]);
					ctx.drawImage(img, -cardW / 2, -cardH / 2, cardW, cardH);
				}

				ctx.restore();
			}
		};

		// Paramètres de mise en page
		const playerAreaCenterX = width * 0.25;
		const dealerAreaCenterX = width * 0.75;

		const boxY = 110;
		const boxWidth = 420;
		const boxHeight = 330;
		const cardsY = 180;
		const scoreYPosition = boxY + boxHeight + 50;

		// =========================
		// 🎮 ZONE JOUEUR
		// =========================
		// Retour du carré en pointillés
		ctx.save();
		ctx.strokeStyle = 'rgba(251, 191, 36, 0.3)';
		ctx.lineWidth = 1;
		ctx.setLineDash([8, 8]);
		ctx.strokeRect(playerAreaCenterX - boxWidth / 2, boxY, boxWidth, boxHeight);
		ctx.restore();

		ctx.save();
		ctx.shadowColor = 'rgba(0,0,0,0.8)';
		ctx.shadowBlur = 8;
		ctx.shadowOffsetY = 3;

		const labelWidth = 180;
		const labelHeight = 45;
		const playerLabelX = playerAreaCenterX - labelWidth / 2;
		const labelY = 50;

		const labelGradient = ctx.createLinearGradient(playerLabelX, labelY, playerLabelX, labelY + labelHeight);
		labelGradient.addColorStop(0, '#15803d');
		labelGradient.addColorStop(1, '#064e3b');

		ctx.fillStyle = labelGradient;
		ctx.fillRect(playerLabelX, labelY, labelWidth, labelHeight);

		ctx.strokeStyle = '#fbbf24';
		ctx.lineWidth = 2;
		ctx.strokeRect(playerLabelX, labelY, labelWidth, labelHeight);

		ctx.fillStyle = '#ffffff';
		ctx.font = 'bold 24px sans-serif';
		ctx.textAlign = 'center';
		ctx.textBaseline = 'middle';
		ctx.fillText('JOUEUR', playerAreaCenterX, labelY + labelHeight / 2);
		ctx.restore();

		// MISE (Plus grosse)
		ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
		ctx.font = 'italic 28px sans-serif';
		ctx.textAlign = 'center';
		ctx.fillText(`Mise : ${bet}`, playerAreaCenterX, boxY + 35);

		// Cartes
		await drawCards(playerCards, playerAreaCenterX, cardsY, false);

		// Score Joueur
		const playerScore = this.calculateScore(playerCards, true);
		ctx.save();
		ctx.shadowColor = 'rgba(0,0,0,0.8)';
		ctx.shadowBlur = 8;
		ctx.shadowOffsetY = 4;
		ctx.textAlign = 'center';
		ctx.textBaseline = 'middle';
		ctx.font = 'bold 72px sans-serif';
		ctx.fillStyle = playerScore > 21 ? '#ef4444' : '#fde047';
		ctx.fillText(`${playerScore}`, playerAreaCenterX, scoreYPosition);
		ctx.restore();

		// =========================
		// 🎩 ZONE CROUPIER
		// =========================
		// Retour du carré en pointillés
		ctx.save();
		ctx.strokeStyle = 'rgba(251, 191, 36, 0.3)';
		ctx.lineWidth = 1;
		ctx.setLineDash([8, 8]);
		ctx.strokeRect(dealerAreaCenterX - boxWidth / 2, boxY, boxWidth, boxHeight);
		ctx.restore();

		ctx.save();
		ctx.shadowColor = 'rgba(0,0,0,0.8)';
		ctx.shadowBlur = 8;
		ctx.shadowOffsetY = 3;

		const dealerLabelX = dealerAreaCenterX - labelWidth / 2;

		const dealerLabelGradient = ctx.createLinearGradient(dealerLabelX, labelY, dealerLabelX, labelY + labelHeight);
		dealerLabelGradient.addColorStop(0, '#7f1d1d');
		dealerLabelGradient.addColorStop(1, '#991b1b');

		ctx.fillStyle = dealerLabelGradient;
		ctx.fillRect(dealerLabelX, labelY, labelWidth, labelHeight);

		ctx.strokeStyle = '#fbbf24';
		ctx.lineWidth = 2;
		ctx.strokeRect(dealerLabelX, labelY, labelWidth, labelHeight);

		ctx.fillStyle = '#ffffff';
		ctx.font = 'bold 24px sans-serif';
		ctx.textAlign = 'center';
		ctx.textBaseline = 'middle';
		ctx.fillText('CROUPIER', dealerAreaCenterX, labelY + labelHeight / 2);
		ctx.restore();

		// Cartes
		await drawCards(dealerCards, dealerAreaCenterX, cardsY, hideDealerSecond);

		// Score Croupier
		const dealerScore = this.calculateScore(dealerCards, !hideDealerSecond);
		ctx.save();
		ctx.shadowColor = 'rgba(0,0,0,0.8)';
		ctx.shadowBlur = 8;
		ctx.shadowOffsetY = 4;
		ctx.textAlign = 'center';
		ctx.textBaseline = 'middle';
		ctx.font = 'bold 72px sans-serif';

		let finalDealerScoreColor;
		if (hideDealerSecond) {
			finalDealerScoreColor = '#fde047';
		} else {
			finalDealerScoreColor = dealerScore > 21 ? '#ef4444' : '#fde047';
		}
		ctx.fillStyle = finalDealerScoreColor;
		ctx.fillText(hideDealerSecond ? '?' : `${dealerScore}`, dealerAreaCenterX, scoreYPosition);
		ctx.restore();

		return canvas.toBuffer();
	}
}
