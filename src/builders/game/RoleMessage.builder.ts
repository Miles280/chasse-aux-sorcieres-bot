import { EmbedBuilder } from 'discord.js';
import { Power, RoleInterface } from '../../models/Role.interface';
import { Camp } from '../../enums/Camp';
import { getAlignmentLabel } from '../../enums/Alignment';
import { emojis } from '../../utils/emojis';
import { colors } from '../../utils/customColors';

export class RoleMessageBuilder {
	/**
	 * Méthode principale pour construire le message de la boutique
	 */
	public static buildRoleEmbed(role: RoleInterface): EmbedBuilder {
		const CAMP_CONFIG = {
			[Camp.VILLAGERS]: {
				color: colors.villagers,
				emoji: emojis.villagers
			},
			[Camp.WITCH]: {
				color: colors.witch,
				emoji: emojis.witch
			},
			[Camp.INDEPENDENT]: {
				color: colors.independent,
				emoji: emojis.independent
			}
		};
		const config = CAMP_CONFIG[role.camp];

		// 1. Ajout de la description
		const description = `${role.description}\n\u200B`;

		const embed = new EmbedBuilder().setTitle(`${config.emoji} ${role.name}`).setColor(config.color).setDescription(description);

		// 2. Ajout de la condition de victoire si nécessaire
		if (role.goal) {
			embed.addFields({
				name: 'Condition de victoire :',
				value: `${role.goal}\n\u200B`,
				inline: false
			});
		}

		// 3. Ajout des pouvoirs
		if (role.powers && role.powers.length > 0) {
			const sortedPowers = [...role.powers].sort((a, b) => a.position - b.position);

			sortedPowers.forEach((power: Power) => {
				embed.addFields({
					name: this.getPowerTitle(power),
					value: power.description,
					inline: false
				});
			});
		}

		if (role.notes) {
			embed.addFields({
				name: '__À savoir :__',
				value: `*${role.notes}*`,
				inline: false
			});
		}

		embed.setImage(`${process.env.BASE_URL}` + `${role.imageUrl}`);

		// 4. Footer dynamique pour les alignements
		const alignmentText =
			role.alignments && role.alignments.length > 0 ? role.alignments.map((alignment) => getAlignmentLabel(alignment)).join('/') : 'Aucun';

		embed.setFooter({
			text: `Alignement : ${alignmentText} ⸱ Minimum : ${role.minPlayer} joueurs`
		});

		return embed;
	}

	private static getPowerTitle(power: Power): string {
		const details: string[] = [];

		// 1. Afficher le nombre d'utilisations si il y en as un
		if (power.usageLimit !== null) {
			const s = power.usageLimit > 1 ? 's' : '';
			details.push(`${power.usageLimit} utilisation${s}`);
		}

		// 2. Afficher le type et le moment si nécessaire
		if (power.isPassive) {
			details.push('Pouvoir passif');
			if (power.isDayPower) {
				details.push('de jour');
			}
		} else if (power.isDayPower) {
			details.push('Pouvoir de jour');
		}

		// 4. Construction de la parenthèse
		const formattedDetails = details.length > 0 ? ` (${details.join(', ')})` : '';

		// 5. Icône de porte
		const doorEmoji = power.leavingHouse ? emojis.opened_door : emojis.closed_door;

		// 6. Résultat final : "Emoji Titre (Détails) :"
		return `${doorEmoji} ${power.title}${formattedDetails} :`;
	}
}
