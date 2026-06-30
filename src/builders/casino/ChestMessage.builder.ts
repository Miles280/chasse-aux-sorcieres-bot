import {
	ActionRowBuilder,
	ButtonBuilder,
	ButtonStyle,
	ContainerBuilder,
	SeparatorBuilder,
	SeparatorSpacingSize,
	TextDisplayBuilder,
	SectionBuilder
} from 'discord.js';
import { colors } from '../../utils/customColors';
import { emojis } from '../../utils/emojis';
import { ActiveMineGame } from '../../models/casino/MineGame.interface';

export class ChestMessageBuilder {
	public static build(game: ActiveMineGame) {
		const currentGain = Math.floor(game.bet * game.currentMultiplier);

		let accentColor = colors.goldCasino;
		let statusText = 'Sauras-tu ouvrir les bons coffres et évite les bombes ?';

		if (game.status === 'LOST') {
			accentColor = colors.fail;
			statusText = 'Tu as ouvert le mauvais coffre et tout perdu...';
		} else if (game.status === 'WON') {
			accentColor = colors.success;
			statusText = '**Bien joué !** Tu as sécurisé tes gains à temps.';
		} else if (game.status === 'TIMEOUT') {
			accentColor = colors.fail;
			statusText = '**Temps écoulé !** La partie a été annulée.';
		}

		// 1. Container principal avec TOUS les textes fusionnés en UN SEUL composant
		const headerText = `### ${emojis.yellowcheck} __Les Coffres de la Destinée__\n${statusText}`;

		const container = new ContainerBuilder()
			.setAccentColor(accentColor)
			.addTextDisplayComponents(new TextDisplayBuilder().setContent(headerText))
			.addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small));

		// 2. Section des stats avec textes fusionnés également
		const statsText = `**Joueur :** <@${game.userId}>\n**Mise :** \`${game.bet}\` ${emojis.rubies}\n**Multiplicateur :** x${game.currentMultiplier.toFixed(2)}\n**Gain actuel :** \`${currentGain}\` ${emojis.rubies}`;

		const statsSection = new SectionBuilder().addTextDisplayComponents(new TextDisplayBuilder().setContent(statsText));

		if (game.status === 'PLAYING') {
			statsSection.setButtonAccessory(
				new ButtonBuilder()
					.setCustomId('chest:cashout')
					.setLabel('💰 Encaisser')
					.setStyle(ButtonStyle.Success)
					.setDisabled(game.revealed.length === 0)
			);
		} else {
			// Bouton rejouer quand la partie est finie
			statsSection.setButtonAccessory(
				new ButtonBuilder().setCustomId(`chest:playAgain:${game.userId}:${game.bet}`).setLabel('🔄 Rejouer').setStyle(ButtonStyle.Primary)
			);
		}

		container.addSectionComponents(statsSection);
		container.addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Large));

		// 3. Ajout de la grille (toujours 30 composants : 5 lignes + 25 boutons)
		const gridRows = this.buildGridRows(game);
		for (const row of gridRows) {
			container.addActionRowComponents(row);
		}

		return {
			components: [container.toJSON()] as any[]
		};
	}

	private static buildGridRows(game: ActiveMineGame): ActionRowBuilder<ButtonBuilder>[] {
		const rows: ActionRowBuilder<ButtonBuilder>[] = [];
		let tileIndex = 0;

		for (let r = 0; r < 5; r++) {
			const row = new ActionRowBuilder<ButtonBuilder>();

			for (let c = 0; c < 5; c++) {
				const isRevealed = game.revealed.includes(tileIndex);
				const tileData = game.grid[tileIndex];

				// J'ai retiré le .setLabel() vide ici qui provoquait une erreur
				const button = new ButtonBuilder().setCustomId(`chest:play:${tileIndex}`).setDisabled(game.status !== 'PLAYING' || isRevealed);

				if (!isRevealed) {
					// Création du numéro de 01 à 25
					const displayNumber = String(tileIndex + 1).padStart(2, '0');

					// Si on joue, on affiche le numéro. Si la partie est finie, on affiche la croix ✖
					button.setLabel(game.status === 'PLAYING' ? displayNumber : '✖');
					button.setStyle(ButtonStyle.Secondary);
				} else {
					if (tileData.type === 'BOMB') {
						button.setEmoji('💣');
						button.setStyle(ButtonStyle.Danger);
					} else if (tileData.type === 'MULTI') {
						button.setLabel(`x${tileData.value}`);
						button.setStyle(ButtonStyle.Success);
					} else {
						button.setEmoji('💨');
						button.setStyle(ButtonStyle.Primary);
					}
				}

				row.addComponents(button);
				tileIndex++;
			}
			rows.push(row);
		}

		return rows;
	}
}
