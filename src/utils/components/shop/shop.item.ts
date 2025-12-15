import { SectionBuilder, SeparatorBuilder, SeparatorSpacingSize, TextDisplayBuilder, ButtonStyle } from 'discord.js';
import { emojisV2 } from '../../emojis';
import { Item } from '../../../models/Shop.interface';

export function buildShopItem(item: Item, currency: string, page: number) {
	const separator = new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small);

	// 📌 Construction dynamique du bloc "Prérequis / Obtient"
	let requirementLines: string[] = [];

	const prereq = [];

	if (item.requiredRoleId) {
		prereq.push(`<@&${item.requiredRoleId}>`);
	}

	if (item.requiredItem) {
		prereq.push(`__${item.requiredItem.name}__`);
	}

	if (prereq.length > 0) {
		requirementLines.push(`-# Prérequis : ${prereq.join(' + ')}`);
	}

	if (item.discordRoleId) {
		requirementLines.push(`-# Obtient : <@&${item.discordRoleId}>`);
	}

	// Construire l'affichage propre
	const requirementBlock = requirementLines.join('\n');

	const section = new SectionBuilder()
		.addTextDisplayComponents(new TextDisplayBuilder().setContent(`**${item.name}**`))
		.addTextDisplayComponents(new TextDisplayBuilder().setContent(`-# Quantité disponible : ${item.quantity === null ? '∞' : item.quantity}`));

	if (requirementBlock) {
		section.addTextDisplayComponents(new TextDisplayBuilder().setContent(requirementBlock));
	}

	section.setButtonAccessory((btn) =>
		btn
			.setCustomId(`buy_${item.id}_${item.requiredRoleId}_${item.discordRoleId}_${item.currency}_${page}`)
			.setLabel(`${item.price}`)
			.setEmoji(currency === 'gems' ? emojisV2.gems : emojisV2.rubies)
			.setStyle(ButtonStyle.Success)
	);

	return { separator, section };
}
