import { EmbedBuilder } from 'discord.js';
import { Power, RoleInterface } from '../../models/Role.interface';
import { Camp } from '../../enums/Camp';
import { emojis } from '../emojis';
import { Alignment } from '../../enums/Alignment';

export function roleEmbed(role: RoleInterface): EmbedBuilder {
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
				name: getPowerTitle(power),
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

	// 4. Footer dynamique pour les alignements
	const alignmentText =
		role.alignments && role.alignments.length > 0 ? role.alignments.map((alignment) => getAlignmentLabel(alignment)).join('/') : 'Aucun';

	embed.setFooter({
		text: `Alignement : ${alignmentText} ⸱ Minimum : ${role.minPlayer} joueurs`
	});

	return embed;
}

// Configuration visuelle par camp (Couleurs et Emojis de titre)
const CAMP_CONFIG = {
	[Camp.VILLAGERS]: {
		color: 0x6cc3a5,
		emoji: emojis.villagers
	},
	[Camp.WITCH]: {
		color: 0x9c59b6,
		emoji: emojis.witch
	},
	[Camp.INDEPENDENT]: {
		color: 0xb3d4e3,
		emoji: emojis.independent
	}
};

/** Getter pour le label de l'alignement */
function getAlignmentLabel(alignment: Alignment): string {
	const labels = {
		[Alignment.KILLER]: 'Tueur',
		[Alignment.INFORMER]: 'Informateur',
		[Alignment.LEADER]: 'Meneur',
		[Alignment.PROTECTOR]: 'Protecteur',
		[Alignment.SUPPORT]: 'Support'
	};
	return labels[alignment];
}

function getPowerTitle(power: Power): string {
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
	const doorEmoji = power.leavingHouse ? emojis.opened_doors : emojis.closed_doors;

	// 6. Résultat final : "Emoji Titre (Détails) :"
	return `${doorEmoji} ${power.title}${formattedDetails} :`;
}
