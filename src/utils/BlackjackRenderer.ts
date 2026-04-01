import { createCanvas, loadImage } from 'canvas';

export class BlackjackRenderer {
	static getCardValue(code: string): number {
		const value = code.slice(0, -1);
		if (['K', 'Q', 'J', '0'].includes(value)) return 10;
		if (value === 'A') return 11;
		return parseInt(value);
	}

	static calculateScore(cards: string[], revealAll = true): number {
		let total = 0;
		let aces = 0;

		for (let i = 0; i < cards.length; i++) {
			if (!revealAll && i === 1) continue;
			const code = cards[i].split('/').pop()?.split('.')[0] || '';
			const val = this.getCardValue(code);
			if (val === 11) aces++;
			total += val;
		}

		while (total > 21 && aces > 0) {
			total -= 10;
			aces--;
		}
		return total;
	}

	static async render(playerCards: string[], dealerCards: string[], bet: number, hideDealerSecond = true) {
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
		// 🎨 BORDURE (Rouge et épaisse) ET SÉPARATEUR
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

		// Position du score calculée sous le carré en pointillés
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
		ctx.font = 'italic 28px sans-serif'; // Typographie agrandie et mise en gras
		ctx.textAlign = 'center';
		ctx.fillText(`Mise : ${bet}`, playerAreaCenterX, boxY + 35); // Légèrement descendu pour respirer

		// Cartes
		await drawCards(playerCards, playerAreaCenterX, cardsY, false);

		// Score Joueur (Épuré)
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

		// Score Croupier (Épuré)
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
