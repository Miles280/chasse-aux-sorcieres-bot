import { EmbedBuilder } from 'discord.js';

export function balanceEmbed(username: string, gems: number, rubies: number) {
	return new EmbedBuilder()
		.setTitle(`${username} - Bourse`)
		.addFields({ name: 'Gemmes', value: gems.toString(), inline: true }, { name: 'Rubis', value: rubies.toString(), inline: true })
		.setColor('#27e9b5')
		.setTimestamp();
}
