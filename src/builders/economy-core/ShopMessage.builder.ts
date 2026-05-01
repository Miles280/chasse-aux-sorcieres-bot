import {
	ActionRowBuilder,
	ButtonBuilder,
	ButtonStyle,
	ContainerBuilder,
	SeparatorBuilder,
	SeparatorSpacingSize,
	TextDisplayBuilder,
	SectionBuilder
} from 'discord.js';
import { Currency } from '../../enums/Currency';
import { Shop, Item } from '../../models/Shop.interface';
import { emojis, emojisV2 } from '../../utils/emojis';
import { colors } from '../../utils/customColors';

export class ShopMessageBuilder {
	/**
	 * Méthode principale pour construire le message de la boutique
	 */
	public static build(currency: Currency, page: number, data: Shop) {
		const { items, pagination } = data;
		const isEmpty = items.length === 0;

		// 1. Initialisation du container principal
		const container = this.buildContainer(isEmpty);

		// 2. Ajout des articles
		for (const item of items) {
			container.addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small));
			container.addSectionComponents(this.buildItemSection(item, currency, page));
		}

		// 3. Ajout du footer (Pagination)
		if (!isEmpty) {
			container.addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Large));
			container.addTextDisplayComponents(
				new TextDisplayBuilder().setContent(
					`-# Page ${pagination.currentPage}/${pagination.totalPages}  •  Articles total : ${pagination.totalItems}`
				)
			);
		}

		// 4. Construction des boutons de navigation
		const navigationRow = this.buildNavigationButtons(currency, pagination.currentPage, pagination.totalPages);

		return {
			components: [container, navigationRow]
		};
	}

	/**
	 * Structure de base de la boutique
	 */
	private static buildContainer(isEmpty: boolean): ContainerBuilder {
		const container = new ContainerBuilder()
			.setAccentColor(colors.purpleWitch)
			.addTextDisplayComponents(
				new TextDisplayBuilder().setContent(`### ${emojis.purplecheck} __Boutique de Nistrium__`),
				new TextDisplayBuilder().setContent('Venez profiter de tous nos articles de qualité rien que pour vous !')
			);

		if (isEmpty) {
			container.addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small));
			container.addTextDisplayComponents(
				new TextDisplayBuilder().setContent("**Aucun article n'est à vendre pour le moment...**"),
				new TextDisplayBuilder().setContent('Revenez plus tard !')
			);
		}

		return container;
	}

	/**
	 * Construit la section pour un article spécifique
	 */
	private static buildItemSection(item: Item, currency: Currency, page: number): SectionBuilder {
		// Préparation du bloc "Prérequis / Obtient"
		const requirements: string[] = [];

		if (item.requiredRoleId) requirements.push(`<@&${item.requiredRoleId}>`);
		if (item.requiredItem) requirements.push(`__${item.requiredItem.name}__`);

		const infoLines: string[] = [];
		if (requirements.length > 0) infoLines.push(`-# Prérequis : ${requirements.join(' + ')}`);
		if (item.discordRoleId) infoLines.push(`-# Obtient : <@&${item.discordRoleId}>`);

		const section = new SectionBuilder().addTextDisplayComponents(
			new TextDisplayBuilder().setContent(`**${item.name}**`),
			new TextDisplayBuilder().setContent(`-# Quantité disponible : ${item.quantity === null ? '∞' : item.quantity}`)
		);

		if (infoLines.length > 0) {
			section.addTextDisplayComponents(new TextDisplayBuilder().setContent(infoLines.join('\n')));
		}

		// Bouton d'achat à droite (Accessory)
		section.setButtonAccessory((btn) => {
			const priceEmoji = currency === Currency.GEMS ? emojisV2.gems : emojisV2.rubies;

			return btn
				.setCustomId(`buy_${item.id}_${item.requiredRoleId ?? ''}_${item.discordRoleId ?? ''}_${currency}_${page}`)
				.setLabel(`${item.price}`)
				.setEmoji(priceEmoji)
				.setStyle(ButtonStyle.Success)
				.setDisabled(item.quantity === 0);
		});

		return section;
	}

	/**
	 * Boutons de navigation en bas du message
	 */
	private static buildNavigationButtons(currency: Currency, page: number, maxPage: number): ActionRowBuilder<ButtonBuilder> {
		const oppositeCurrency = currency === Currency.GEMS ? Currency.RUBIES : Currency.GEMS;

		return new ActionRowBuilder<ButtonBuilder>().addComponents(
			new ButtonBuilder()
				.setCustomId(`shop_prev_${currency}_${page}`)
				.setLabel('◀ Précédent')
				.setStyle(ButtonStyle.Secondary)
				.setDisabled(page <= 1),

			new ButtonBuilder()
				.setCustomId(`shop_next_${currency}_${page}`)
				.setLabel('Suivant ▶')
				.setStyle(ButtonStyle.Secondary)
				.setDisabled(page >= maxPage),

			new ButtonBuilder()
				.setCustomId(`shop_currency_${oppositeCurrency}_1`)
				.setEmoji(oppositeCurrency === 'gems' ? emojis.gems : emojis.rubies)
				.setStyle(ButtonStyle.Secondary)
		);
	}
}
