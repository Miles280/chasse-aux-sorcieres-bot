import { SeparatorBuilder, SeparatorSpacingSize, TextDisplayBuilder } from 'discord.js';
import { ShopResponse } from '../../../models/Shop.interface';

export function buildShopFooter(shopView: ShopResponse) {
	const separator = new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Large);

	const footer = new TextDisplayBuilder().setContent(`-# Page ${shopView.page}/${shopView.pages}  •  Articles total : ${shopView.total}`);
	return { separator, footer };
}
