import { ContainerBuilder, TextDisplayBuilder } from 'discord.js';
import { emojis } from '../../emojis';

export function buildShopContainer() {
	return new ContainerBuilder()
		.setAccentColor(0x360a5c)
		.addTextDisplayComponents(new TextDisplayBuilder().setContent(`## ${emojis.purplecheck} __Boutique de Nistrium__`))
		.addTextDisplayComponents(new TextDisplayBuilder().setContent('Venez profiter de tous nos articles de qualité rien que pour vous !'));
}
