import { ActionRowBuilder, ButtonBuilder, ButtonStyle, GuildMember } from 'discord.js';
import { Currency } from '../enums/Currency';
import * as Embeds from '../utils/embeds';

interface SellOptions {
	seller: GuildMember;
	buyer: GuildMember;
	item: any; // Remplace par ton interface Item si nécessaire
	itemId: number;
	price: number;
	currency: Currency;
}

export class SellMessageBuilder {
	/**
	 * Construit le message de proposition de vente
	 */
	public static build(options: SellOptions) {
		const { seller, buyer, item, currency, price, itemId } = options;

		return {
			content: `<@${buyer.id}> Une opportunité s'offre à toi.`,
			embeds: [Embeds.sellProposalEmbed({ seller, buyer, item, currency, price })],
			components: [this.buildButtons(seller.id, buyer.id, itemId, price, currency)]
		};
	}

	/**
	 * Génère les boutons Accepter / Refuser
	 */
	private static buildButtons(sellerId: string, buyerId: string, itemId: number, price: number, currency: string) {
		return new ActionRowBuilder<ButtonBuilder>().addComponents(
			new ButtonBuilder()
				.setCustomId(`sell_accept_${sellerId}_${buyerId}_${itemId}_${currency}_${price}`)
				.setLabel('Accepter')
				.setStyle(ButtonStyle.Success),

			new ButtonBuilder()
				.setCustomId(`sell_deny_${sellerId}_${buyerId}_${itemId}_${currency}_${price}`)
				.setLabel('Refuser')
				.setStyle(ButtonStyle.Danger)
		);
	}

	/**
	 * Désactive les composants
	 */
	public static disableComponents(components: ActionRowBuilder<any>[]) {
		if (!components) return [];

		// On map sur les lignes existantes
		return components.map((row) => {
			// On récupère les composants de la ligne et on les désactive
			row.components.forEach((component) => {
				if (typeof component.setDisabled === 'function') {
					component.setDisabled(true);
				}
			});
			return row;
		});
	}
}
