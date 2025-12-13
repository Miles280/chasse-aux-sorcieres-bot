import { EmbedBuilder, GuildMember } from 'discord.js';
import { Item, ShopResponse } from '../../models/Shop.interface';
import { emojis } from '../emojis';

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
		name: 'Nom :',
		value: item.name,
		inline: true
	});

	fields.push({
		name: 'Prix :',
		value: `${item.price} ${item.currency === 'gems' ? emojis.gems : emojis.rubies}`,
		inline: true
	});

	fields.push({
		name: 'Quantité restante:',
		value: `${item.quantity || '∞'}`,
		inline: true
	});

	fields.push({
		name: 'Description :',
		value: item.description || 'Aucune description.',
		inline: false
	});

	if (item.discordRoleId) {
		fields.push({
			name: "Permet d'obtenir ce rôle :",
			value: `<@&${item.discordRoleId}>`,
			inline: false
		});
	}

	let prereq = [];

	if (item.requiredRoleId) {
		prereq.push(`<@&${item.requiredRoleId}>`);
	}

	if (item.requiredItem) {
		prereq.push(`__${item.requiredItem.name}__`);
	}

	if (prereq.length > 0) {
		fields.push({
			name: "Prérequis d'achat :",
			value: prereq.join(' + '),
			inline: true
		});
	}

	return new EmbedBuilder()
		.setColor('#360a5c')
		.setTitle(`${emojis.purplecheck} __Détail d'un article__`)
		.addFields(fields)
		.setFooter({ text: 'Faites /boutique pour explorer les autres articles en vente.' });
}

export function inventoryEmbed({ member, items }: { member: GuildMember; items: Item[] }): EmbedBuilder {
	const formattedItems =
		items.length > 0 ? items.map((item) => `> - ${item.name}  x\`${item.quantity}\` `).join('\n') : '> Aucun item dans votre inventaire.';

	return new EmbedBuilder()
		.setAuthor({
			name: member.displayName,
			iconURL: member.user.displayAvatarURL()
		})
		.setTitle(`${emojis.purplecheck} __Inventaire de ${member.displayName}__`)
		.setDescription(formattedItems)
		.setColor('#360a5c')
		.setFooter({ text: 'Vendez un de vos items à un joueur avec /item sell !' });
}

export function sellProposalEmbed({
	seller,
	buyer,
	item,
	price,
	currency
}: {
	seller: GuildMember;
	buyer: GuildMember;
	item: Item;
	price: number;
	currency: 'gems' | 'rubies';
}) {
	return new EmbedBuilder()
		.setTitle(`${emojis.yellowcheck} Proposition de vente`)
		.setDescription(
			`<@${seller.id}> souhaite te vendre un item :\n\n` +
				`**Item :** ${item.name}\n` +
				`**Prix :** ${price} ${currency === 'gems' ? emojis.gems : emojis.rubies}\n\n` +
				`Souhaites-tu acheter cette article ? <@${buyer.id}>`
		)
		.setColor('#f5cb26')
		.setFooter({
			text: `Une minute avant refus automatique.`
		})
		.setTimestamp();
}
