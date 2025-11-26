import { ContainerBuilder, TextDisplayBuilder } from 'discord.js';

export function buildShopContainer() {
	return new ContainerBuilder()
		.setAccentColor(0x360a5c)
		.addTextDisplayComponents(new TextDisplayBuilder().setContent('## __Boutique de Nistrium__'));
}
