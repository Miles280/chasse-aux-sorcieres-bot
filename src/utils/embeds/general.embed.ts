import { EmbedBuilder, GuildMember } from 'discord.js';
import { emojis } from '../emojis';
import { colors } from '../customColors';

export function errorEmbed({ message, member, title }: { message: string; member?: GuildMember; title?: string }): EmbedBuilder {
	const embed = new EmbedBuilder().setDescription(message).setColor(colors.fail);

	if (member) {
		embed.setAuthor({
			name: member.displayName,
			iconURL: member.user.displayAvatarURL()
		});
	}
	if (title) {
		embed.setTitle(`${emojis.deny} ${title}`);
	}
	return embed;
}

export function successEmbed({ message, member, title }: { message: string; member?: GuildMember; title?: string }): EmbedBuilder {
	const embed = new EmbedBuilder().setDescription(message).setColor(colors.success);

	if (member) {
		embed.setAuthor({
			name: member.displayName,
			iconURL: member.user.displayAvatarURL()
		});
	}

	if (title) {
		embed.setTitle(`${emojis.greencheck} ${title}`);
	}
	return embed;
}
