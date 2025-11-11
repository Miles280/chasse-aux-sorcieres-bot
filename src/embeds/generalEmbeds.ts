import { EmbedBuilder, GuildMember } from 'discord.js';
import { emojis } from '../utils/emojis';

export function errorEmbed({ member, title, message }: { member?: GuildMember; title?: string; message: string }): EmbedBuilder {
	const embed = new EmbedBuilder().setDescription(message).setColor(0xe74c3c);

	if (member) {
		embed.setAuthor({
			name: member.displayName,
			iconURL: member.user.displayAvatarURL()
		});
	}
	if (title) {
		embed.setTitle(`${emojis.uncheck} ${title}`);
	}
	return embed;
}

export function successEmbed({ member, title, message }: { member: GuildMember; title?: string; message: string }): EmbedBuilder {
	const embed = new EmbedBuilder()
		.setAuthor({
			name: member.displayName,
			iconURL: member.user.displayAvatarURL()
		})
		.setDescription(message)
		.setColor(0x2ecc71);

	if (title) {
		embed.setTitle(`${emojis.check} ${title}`);
	}
	return embed;
}
