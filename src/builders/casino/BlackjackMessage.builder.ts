import { ActionRowBuilder, ButtonBuilder, ButtonStyle, AttachmentBuilder } from 'discord.js';
import { createCanvas, loadImage } from 'canvas';
import { BlackjackGame } from '../../models/BlackjackGame.interface';
import { colors } from '../../utils/customColors';
import { emojis } from '../../utils/emojis';

export class BlackjackMessageBuilder {
	/**
	 * Extrait la valeur d'une carte (nom du fichier) pour le calcul du score.
	 */
	private static getCardValue(url: string): number {
		// 1. Extraction du nom de fichier et normalisation en majuscules
		const filename = url.split('/').pop()?.split('.')[0].toUpperCase() || '';
		if (!filename) return 0;

		const firstChar = filename[0];

		// 2. L'As vaut 11 par défaut
		if (firstChar === 'A') return 11;
		// 3. Les figures (K, Q, J) et le 10 valent 10
		if (['K', 'Q', 'J', '0', '1'].includes(firstChar)) return 10;

		// 4. Conversion numérique pour les autres cartes (2 à 9)
		const val = parseInt(firstChar);
		return isNaN(val) ? 0 : val;
	}

	/**
	 * Calcule le score total d'une main en gérant dynamiquement la valeur des As.
	 */
	public static calculateScore(cardUrls: string[], revealAll = true): number {
		// 1. Initialisation des compteurs
		let total = 0;
		let aces = 0;

		// 2. Cumul des valeurs en ignorant la carte cachée si nécessaire
		for (let i = 0; i < cardUrls.length; i++) {
			if (!revealAll && i === 1) continue;

			const val = this.getCardValue(cardUrls[i]);
			if (val === 11) aces++;
			total += val;
		}

		// 3. Ajustement de la valeur des As (11 -> 1) en cas de dépassement
		while (total > 21 && aces > 0) {
			total -= 10;
			aces--;
		}
		return total;
	}

	/**
	 * Construit le message complet de l'interaction (Embed + Canvas + Boutons).
	 */
	public static async buildGameMessage(game: BlackjackGame) {
		// 1. Définition de l'état de la partie et génération du visuel
		const isFinished = game.status === 'finished';
		const hideDealer = game.status === 'playing';
		const buffer = await this.renderCanvas(game, hideDealer);
		const attachment = new AttachmentBuilder(buffer, { name: 'blackjack.png' });

		// 2. Gestion de la couleur (Fail si défaite ou temps écoulé)
		const isFailed = game.result === 'lose' || game.result === 'timeout';
		const embedColor = isFinished ? (isFailed ? colors.fail : colors.success) : colors.goldCasino;

		// 3. Sélection de l'émoji de titre selon le résultat
		let titleEmoji = emojis.yellowcheck;
		if (isFinished) {
			if (game.result === 'win' || game.result === 'blackjack') titleEmoji = emojis.greencheck;
			else if (game.result === 'lose') titleEmoji = emojis.redcheck;
			else titleEmoji = emojis.greencheck;
		}

		// 4. Construction du texte de statut (résultat final ou score en cours)
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

		// 5. Gestion des boutons d'action (jeu ou rejouer)
		let actionRows = [];
		if (!isFinished) {
			const row = new ActionRowBuilder<ButtonBuilder>();
			row.addComponents(new ButtonBuilder().setCustomId(`bj:hit:${game.messageId}`).setLabel('Tirer').setStyle(ButtonStyle.Primary));
			if (game.playerCards.length === 2) {
				row.addComponents(new ButtonBuilder().setCustomId(`bj:double:${game.messageId}`).setLabel('Doubler').setStyle(ButtonStyle.Success));
			}
			row.addComponents(new ButtonBuilder().setCustomId(`bj:stand:${game.messageId}`).setLabel("S'arrêter").setStyle(ButtonStyle.Secondary));
			actionRows.push(row);
		} else {
			actionRows.push(
				new ActionRowBuilder<ButtonBuilder>().addComponents(
					new ButtonBuilder().setCustomId(`bj:replay:${game.initialBet}:${game.userId}`).setLabel(`Rejouer`).setStyle(ButtonStyle.Primary)
				)
			);
		}

		// 6. Retour de l'objet de message complet
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

	/**
	 * Génère l'image Canvas représentant la table de jeu, les cartes et les scores.
	 */
	private static async renderCanvas(game: BlackjackGame, hideDealerSecond: boolean) {
		// 1. Initialisation du canvas et du contexte
		const { playerCards, dealerCards, bet } = game;
		const width = 1000;
		const height = 600;
		const canvas = createCanvas(width, height);
		const ctx = canvas.getContext('2d');
		const centerX = width / 2;

		// 2. Création du fond dégradé casino
		const gradient = ctx.createRadialGradient(centerX, height / 2, 50, centerX, height / 2, 700);
		gradient.addColorStop(0, '#0a5d1e');
		gradient.addColorStop(0.5, '#063919');
		gradient.addColorStop(1, '#021a0c');
		ctx.fillStyle = gradient;
		ctx.fillRect(0, 0, width, height);

		// 3. Tracé du motif de diamants en arrière-plan
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

		// 4. Dessin de la bordure et du séparateur central
		ctx.strokeStyle = '#7f1d1d';
		ctx.lineWidth = 12;
		ctx.strokeRect(6, 6, width - 12, height - 12);
		const centerGradient = ctx.createLinearGradient(centerX - 2, 0, centerX + 2, 0);
		centerGradient.addColorStop(0, 'rgba(251, 191, 36, 0)');
		centerGradient.addColorStop(0.5, 'rgba(251, 191, 36, 0.5)');
		centerGradient.addColorStop(1, 'rgba(251, 191, 36, 0)');
		ctx.fillStyle = centerGradient;
		ctx.fillRect(centerX - 1, 40, 2, height - 80);

		// 5. Fonction interne pour le rendu des cartes (éventail, ombre et dos)
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

		// 6. Paramétrage des zones Joueur et Croupier
		const playerAreaCenterX = width * 0.25;
		const dealerAreaCenterX = width * 0.75;
		const boxY = 110;
		const boxWidth = 420;
		const boxHeight = 330;
		const cardsY = 180;
		const scoreYPosition = boxY + boxHeight + 50;

		// 7. Rendu de la zone Joueur (cadre, label, mise et score)
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

		ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
		ctx.font = 'italic 28px sans-serif';
		ctx.textAlign = 'center';
		ctx.fillText(`Mise : ${bet}`, playerAreaCenterX, boxY + 35);
		await drawCards(playerCards, playerAreaCenterX, cardsY, false);

		const playerScore = this.calculateScore(playerCards, true);
		ctx.save();
		ctx.textAlign = 'center';
		ctx.textBaseline = 'middle';
		ctx.font = 'bold 72px sans-serif';
		ctx.fillStyle = playerScore > 21 ? '#ef4444' : '#fde047';
		ctx.fillText(`${playerScore}`, playerAreaCenterX, scoreYPosition);
		ctx.restore();

		// 8. Rendu de la zone Croupier (cadre, label et score avec masquage)
		ctx.save();
		ctx.strokeStyle = 'rgba(251, 191, 36, 0.3)';
		ctx.lineWidth = 1;
		ctx.setLineDash([8, 8]);
		ctx.strokeRect(dealerAreaCenterX - boxWidth / 2, boxY, boxWidth, boxHeight);
		ctx.restore();

		ctx.save();
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

		await drawCards(dealerCards, dealerAreaCenterX, cardsY, hideDealerSecond);
		const dealerScore = this.calculateScore(dealerCards, !hideDealerSecond);
		ctx.save();
		ctx.textAlign = 'center';
		ctx.textBaseline = 'middle';
		ctx.font = 'bold 72px sans-serif';
		ctx.fillStyle = !hideDealerSecond && dealerScore > 21 ? '#ef4444' : '#fde047';
		ctx.fillText(hideDealerSecond ? '?' : `${dealerScore}`, dealerAreaCenterX, scoreYPosition);
		ctx.restore();

		// 9. Export du buffer final
		return canvas.toBuffer();
	}
}
