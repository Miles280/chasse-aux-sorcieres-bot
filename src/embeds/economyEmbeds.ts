import { EmbedBuilder, GuildMember } from 'discord.js';
import { emojis } from '../utils/emojis';

interface BourseEmbedParams {
	member: GuildMember;
	gems: number;
	rubies: number;
	transactionsText?: string;
}

export function bourseEmbed({ member, gems, rubies, transactionsText }: BourseEmbedParams): EmbedBuilder {
	return new EmbedBuilder()
		.setAuthor({
			name: member.displayName,
			iconURL: member.user.displayAvatarURL()
		})
		.setTitle(`__Bourse de ${member.displayName}__`)
		.addFields(
			{ name: 'Contenu :', value: `> \`${gems}\` ${emojis.gems}`, inline: true },
			{ name: '\u200B', value: `> \`${rubies}\` ${emojis.rubies}`, inline: true }
		)
		.addFields({
			name: '\nDernières transactions :',
			value: transactionsText || 'Aucune transaction.'
		})
		.setColor('#360a5c')
		.setFooter({ text: 'Essayez /boutique et /historique !' });
}
