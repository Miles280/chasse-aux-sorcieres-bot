import { EmbedBuilder, GuildMember } from 'discord.js';
import { emojis } from '../emojis';
import { colors } from '../customColors';

export function errorEmbed({ message, member, title }: { message: string; member?: GuildMember; title?: string }): EmbedBuilder {
	const embed = new EmbedBuilder().setDescription(message ?? 'Une erreur inconnue est survenue.').setColor(colors.fail);

	if (member) {
		embed.setAuthor({
			name: member.displayName,
			iconURL: member.user.displayAvatarURL()
		});
	}
	if (title) {
		embed.setTitle(`${emojis.redcheck} ${title}`);
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

export function siteInfoEmbed(): EmbedBuilder {
	return new EmbedBuilder()
		.setTitle(`${emojis.purplecheck} Site Officiel`)
		.setDescription(
			`Un site officiel existe pour présenter la **Chasse aux Sorcières de Nistrium**.

Sur le site, vous pourrez notamment :
- Découvrir les **rôles**
- Lire les **règles**
- Explorer le **lore**

> D'autres fonctionnalités arriveront plus tard !

Rappel : Le jeu __ne se joue pas sur le site__, mais uniquement ici sur Discord.
`
		)
		.setColor(colors.purpleWitch)
		.setFooter({
			text: 'Utilisez le bouton ci-dessous pour visiter le site.'
		});
}
