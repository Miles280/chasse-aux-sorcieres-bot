import { SeparatorBuilder, SeparatorSpacingSize, TextDisplayBuilder } from 'discord.js';
import { ShopView } from '../../../models/Shop.interface';

export function buildShopFooter(shopView: ShopView) {
	const separator = new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Large);

	const footer = new TextDisplayBuilder().setContent(`-# Page ${shopView.page}/${shopView.pages}  •  Articles total : ${shopView.total}`);
	return { separator, footer };
}
