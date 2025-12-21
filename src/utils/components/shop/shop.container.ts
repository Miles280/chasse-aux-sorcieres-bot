import { ContainerBuilder, SeparatorBuilder, SeparatorSpacingSize, TextDisplayBuilder } from 'discord.js';
import { emojis } from '../../emojis';

export function buildShopContainer(isEmpty: boolean) {
	const container = new ContainerBuilder()
		.setAccentColor(0x360a5c)
		.addTextDisplayComponents(new TextDisplayBuilder().setContent(`### ${emojis.purplecheck} __Boutique de Nistrium__`))
		.addTextDisplayComponents(new TextDisplayBuilder().setContent('Venez profiter de tous nos articles de qualité rien que pour vous !'));

	if (isEmpty) {
		container.addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small));
		container.addTextDisplayComponents(new TextDisplayBuilder().setContent('**Aucun article est à vendre pour le moment...**'));
		container.addTextDisplayComponents(new TextDisplayBuilder().setContent('Revenez plus tard !'));
	}

	return container;
}
