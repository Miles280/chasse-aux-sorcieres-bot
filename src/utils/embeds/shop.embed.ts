import { EmbedBuilder, GuildMember } from 'discord.js';
import { Item, ShopResponse } from '../../models/Shop.interface';

export function shopEmbed(shopData: ShopResponse) {
	const embed = new EmbedBuilder()
		.setTitle(`Boutique de Nistrium`)
		.setColor('#360a5c')
		.setFooter({ text: `Page ${shopData.page}/${shopData.pages}` })
		.setTimestamp();

	shopData.items.forEach((item, index) => {
		embed.addFields({
			name: `${index + 1}. ${item.name} (${item.price} ${item.currency})`,
			value: item.description
		});
	});

	return embed;
}

export function itemInfoEmbed(item: Item) {
	const fields = [];

	fields.push({
		name: '💎 Nom',
		value: item.name,
		inline: false
	});

	fields.push({
		name: '📜 Description',
		value: item.description || 'Aucune description.',
		inline: false
	});

	fields.push({
		name: '💰 Prix',
		value: `${item.price} ${item.currency === 'gems' ? '💠 gemmes' : '🔴 rubis'}`,
		inline: true
	});

	fields.push({
		name: '📦 Type',
		value: item.type,
		inline: true
	});

	// 🔒 Affiche le rôle requis SI présent
	if (item.requiredRoleId) {
		fields.push({
			name: '🔑 Rôle requis',
			value: `<@&${item.requiredRoleId}>`,
			inline: false
		});
	}

	// 🧩 Affiche l'item requis SI présent
	if (item.requiredItem) {
		fields.push({
			name: '🧩 Item requis',
			value: `${item.requiredItem.name} (ID: ${item.requiredItem.id})`,
			inline: false
		});
	}

	// 🎁 Quantité si c'est un consommable ou pack
	if (item.quantity !== undefined) {
		fields.push({
			name: '📦 Quantité',
			value: `${item.quantity}`,
			inline: true
		});
	}

	const embed = new EmbedBuilder().setTitle(`📌 Informations sur l'item #${item.id}`).setColor('#27e9b5').addFields(fields);

	return embed;
}

export function inventoryEmbed({ member, items }: { member: GuildMember; items: Item[] }): EmbedBuilder {
	const formattedItems =
		items.length > 0 ? items.map((item) => `> **${item.name}**  x\`${item.quantity}\` `).join('\n') : '> Aucun item dans votre inventaire.';

	return new EmbedBuilder()
		.setAuthor({
			name: member.displayName,
			iconURL: member.user.displayAvatarURL()
		})
		.setTitle(`__Inventaire de ${member.displayName}__`)
		.setDescription(formattedItems)
		.setColor('#360a5c')
		.setFooter({ text: 'Utilisez /boutique pour acheter des items !' });
}
