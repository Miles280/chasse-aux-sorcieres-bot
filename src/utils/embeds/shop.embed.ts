import { EmbedBuilder, GuildMember } from 'discord.js';
import { Inventory, Item } from '../../models/Shop.interface';
import { emojis } from '../emojis';
import { colors } from '../customColors';

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
		.setColor(colors.purpleWitch)
		.setTitle(`${emojis.purplecheck} __Détail d'un article__`)
		.addFields(fields)
		.setFooter({ text: 'Faites /boutique pour explorer les autres articles en vente.' });
}

export function inventoryEmbed({ member, inventory }: { member: GuildMember; inventory: Inventory }): EmbedBuilder {
	const formattedItems =
		inventory.items.length > 0
			? inventory.items
					// On déstructure "item" (les infos de l'objet) et "quantity" (le nombre possédé)
					.map(({ item, quantity }) => `> - ${item.name}  x\`${quantity}\``)
					.join('\n')
			: '> Aucun item dans votre inventaire.';

	return new EmbedBuilder()
		.setAuthor({
			name: member.displayName,
			iconURL: member.user.displayAvatarURL()
		})
		.setTitle(`${emojis.purplecheck} __Inventaire de ${member.displayName}__`)
		.setDescription(formattedItems)
		.setColor(colors.purpleWitch)
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
