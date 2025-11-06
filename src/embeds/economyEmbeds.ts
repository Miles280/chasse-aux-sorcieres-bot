import { EmbedBuilder, GuildMember } from 'discord.js';

export function balanceEmbed(username: string, gems: number, rubies: number) {
	return new EmbedBuilder()
		.setTitle(`${username} - Bourse`)
		.addFields({ name: 'Gemmes', value: gems.toString(), inline: true }, { name: 'Rubis', value: rubies.toString(), inline: true })
		.setColor('#27e9b5')
		.setTimestamp();
}

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
		.addFields({ name: 'Contenu :', value: `> \`${gems}\` 💎`, inline: true }, { name: '\u200B', value: `> \`${rubies}\` 💠`, inline: true })
		.addFields({
			name: '\nDernières transactions :',
			value: transactionsText || 'Aucune transaction.'
		})
		.setColor('#360a5c')
		.setFooter({ text: 'Essayez /boutique et /historique !' });
}
