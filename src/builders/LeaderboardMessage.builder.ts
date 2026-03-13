import { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } from 'discord.js';
import { Currency } from '../enums/Currency';
import { LeaderboardData } from '../models/Economy.interface';
import { emojis } from '../utils/emojis';
import { colors } from '../utils/customColors';

export class LeaderboardMessageBuilder {
	public static build(currency: Currency, currentPage: number, data: LeaderboardData) {
		const { users, pagination } = data;
		const isGems = currency === Currency.GEMS;
		const currencyEmoji = isGems ? emojis.gems : emojis.rubies;

		// 1. Construction de l'Embed
		const embed = new EmbedBuilder()
			.setTitle(`${emojis.purplecheck} __Classement__`)
			.setColor(colors.purpleWitch)
			.setDescription(`Voici les citoyens les plus prospères du serveur.`)
			.setFooter({
				text: `Page ${pagination.currentPage}/${pagination.totalPages} • Total : ${pagination.totalItems.toLocaleString()} joueurs`
			});

		if (!users || users.length === 0) {
			embed.addFields({ name: '\u200B', value: '*Aucun joueur trouvé dans le classement.*' });
		} else {
			// --- LISTE UNIFORME (Tout le monde pareil) ---
			const listContent = users
				.map((user, index) => {
					const rank = (currentPage - 1) * 10 + (index + 1);
					const amount = isGems ? user.gems : user.rubies;

					return `**${rank}.** <@${user.discordId}>  •  \`${amount.toLocaleString()}\` ${currencyEmoji}`;
				})
				.join('\n');

			embed.addFields({
				name: '**Membres :**',
				value: listContent
			});
		}

		// 2. Construction des boutons
		const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
			new ButtonBuilder()
				.setCustomId(`leaderboard:page:prev:${currency}:${currentPage}`)
				.setLabel('◀ Précédent')
				.setStyle(ButtonStyle.Secondary)
				.setDisabled(currentPage <= 1),

			new ButtonBuilder()
				.setCustomId(`leaderboard:page:next:${currency}:${currentPage}`)
				.setLabel('Suivant ▶')
				.setStyle(ButtonStyle.Secondary)
				.setDisabled(currentPage >= pagination.totalPages),

			new ButtonBuilder()
				.setCustomId(`leaderboard:switch:${isGems ? 'rubies' : 'gems'}:${currentPage}`)
				.setEmoji(isGems ? emojis.rubies : emojis.gems)
				.setStyle(ButtonStyle.Secondary)
		);

		return {
			embeds: [embed],
			components: [row]
		};
	}
}
