import { SeparatorBuilder, SeparatorSpacingSize, TextDisplayBuilder } from 'discord.js';

export function buildShopFooter(pagination: { currentPage: number; totalPages: number; totalItems: number }) {
	const separator = new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Large);

	const footer = new TextDisplayBuilder().setContent(
		`-# Page ${pagination.currentPage}/${pagination.totalPages}  •  Articles total : ${pagination.totalItems}`
	);
	return { separator, footer };
}
