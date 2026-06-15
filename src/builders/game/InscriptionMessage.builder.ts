import {
	EmbedBuilder,
	ActionRowBuilder,
	ButtonBuilder,
	ButtonStyle,
	Message,
	ContainerBuilder,
	SeparatorSpacingSize,
	TextDisplayBuilder,
	SeparatorBuilder,
	SectionBuilder
} from 'discord.js';
import { CompoData, GameData } from '../../models/Game.interface';
import { colors } from '../../utils/customColors';
import { emojis, emojisV2 } from '../../utils/emojis';
import { RoleInterface } from '../../models/Role.interface';
import { Alignment, getAlignmentLabel } from '../../enums/Alignment';

export class InscriptionMessageBuilder {
	/**
	 * Construit le message d'inscription ouvert
	 */
	public static buildOpened(game: GameData, inscriptionVocId: string, maxPlayers: number | null, closeTimestamp: number | null) {
		// Filtrage des joueurs et spectateurs depuis la nouvelle structure gamePlayers
		const activePlayers = game.gamePlayers?.filter((p) => !p.isSpectator) || [];
		const spectators = game.gamePlayers?.filter((p) => p.isSpectator) || [];

		// Formatage du compteur max
		const limitText = maxPlayers ? `/${maxPlayers}` : '';

		// Listes (avec fallback si vide)
		const playersList = activePlayers.length > 0 ? activePlayers.map((p) => `> <@${p.user.discordId}>`).join('\n') : '> *Aucun inscrit*';

		const hasSpectators = spectators.length > 0;
		const spectatorsList = hasSpectators ? spectators.map((p) => `> <@${p.user.discordId}>`).join('\n') : null;

		const embed = new EmbedBuilder()
			.setColor(colors.purpleWitch)
			.setTitle(`${emojis.purplecheck} Inscriptions ouvertes !`)
			.setDescription(
				`Le brouillard se lève sur Nistrium... Inscriras-tu ton nom au registre ou préféreras-tu observer le chaos depuis les ombres ?\n\n` +
					`__Animateur__ : <@${game.gameMaster.discordId}>\n` +
					`__Vocal d'attente__ : <#${inscriptionVocId}>\n` +
					`\u200B`
			)
			.setThumbnail(
				'https://cdn.discordapp.com/attachments/1452366108765061172/1452465270802354298/Chapo.png?ex=69e22e72&is=69e0dcf2&hm=447360bcbb9363a1f14ae1bb34b47257833a8dfb12056c28dc82e5ea3db5df2c&'
			)
			.addFields({
				name: `Liste des joueurs :`,
				value: `${playersList}\n${activePlayers.length}${limitText} inscrit${activePlayers.length > 1 ? 's' : ''}`,
				inline: true
			});

		// On n'ajoute les colonnes s'il y a des spectateurs
		if (hasSpectators && spectatorsList) {
			embed.addFields(
				{
					name: '\u200B',
					value: '\u200B',
					inline: true
				},
				{
					name: `Spectateurs :`,
					value: `${spectatorsList}\n${spectators.length} spectateur${spectators.length > 1 ? 's' : ''}`,
					inline: true
				}
			);
		}

		// Gestion du footer
		if (closeTimestamp) {
			embed.addFields({ name: '\u200B', value: `-# Fermeture des inscriptions <t:${closeTimestamp}:R>.`, inline: false });
		}

		const buttons = this.buildActionButtons(game.id, 'opened');

		return { embeds: [embed], components: [buttons] };
	}

	/**
	 * Construit le message d'inscription fermé
	 */
	public static buildClosed(game: GameData, inscriptionVocId: string) {
		const activePlayers = game.gamePlayers?.filter((p) => !p.isSpectator) || [];
		const spectators = game.gamePlayers?.filter((p) => p.isSpectator) || [];

		const playersList = activePlayers.length > 0 ? activePlayers.map((p) => `> <@${p.user.discordId}>`).join('\n') : '> *Aucun inscrit*';

		const hasSpectators = spectators.length > 0;
		const spectatorsList = hasSpectators ? spectators.map((p) => `> <@${p.user.discordId}>`).join('\n') : null;

		const embed = new EmbedBuilder()
			.setColor(colors.orange)
			.setTitle(`${emojis.orangecheck} Inscriptions fermées !`)
			.setDescription(
				`Le portail de Nistrium s'est refermé. Le sort en est jeté, et les joueurs sont désormais scellés dans cette partie.\n\n` +
					`__Animateur__ : <@${game.gameMaster.discordId}>\n` +
					`__Vocal d'attente__ : <#${inscriptionVocId}>\n` +
					`\u200B`
			)
			.setThumbnail(
				'https://cdn.discordapp.com/attachments/1452366108765061172/1452465270802354298/Chapo.png?ex=69e22e72&is=69e0dcf2&hm=447360bcbb9363a1f14ae1bb34b47257833a8dfb12056c28dc82e5ea3db5df2c&'
			)
			.addFields({
				name: `Liste des joueurs :`,
				value: `${playersList}\n${activePlayers.length} inscrit${activePlayers.length > 1 ? 's' : ''}`,
				inline: true
			});

		if (hasSpectators && spectatorsList) {
			embed.addFields(
				{
					name: '\u200B',
					value: '\u200B',
					inline: true
				},
				{
					name: `Spectateurs :`,
					value: `${spectatorsList}\n${spectators.length} spectateur${spectators.length > 1 ? 's' : ''}`,
					inline: true
				}
			);
		}

		const buttons = this.buildActionButtons(game.id, 'closed');

		return { embeds: [embed], components: [buttons] };
	}

	/**
	 * Construit le message d'inscription quand la partie est lancée
	 */
	public static buildStarted(game: GameData) {
		const activePlayers = game.gamePlayers?.filter((p) => !p.isSpectator) || [];
		const spectators = game.gamePlayers?.filter((p) => p.isSpectator) || [];

		const playersList = activePlayers.length > 0 ? activePlayers.map((p) => `> <@${p.user.discordId}>`).join('\n') : '> *Aucun inscrit*';

		const hasSpectators = spectators.length > 0;
		const spectatorsList = hasSpectators ? spectators.map((p) => `> <@${p.user.discordId}>`).join('\n') : null;

		const embed = new EmbedBuilder()
			.setColor(colors.orange)
			.setTitle(`${emojis.orangecheck} Inscriptions fermées !`)
			.setDescription(
				`Le portail de Nistrium s'est refermé. Le sort en est jeté, et les joueurs sont désormais scellés dans cette partie.\n\n` +
					`__Animateur__ : <@${game.gameMaster.discordId}>\n` +
					`__Status__ : Partie en cours...\n` +
					`\u200B`
			)
			.setThumbnail(
				'https://cdn.discordapp.com/attachments/1452366108765061172/1452465270802354298/Chapo.png?ex=69e22e72&is=69e0dcf2&hm=447360bcbb9363a1f14ae1bb34b47257833a8dfb12056c28dc82e5ea3db5df2c&'
			)
			.addFields({
				name: `Liste des joueurs :`,
				value: `${playersList}\n${activePlayers.length} inscrit${activePlayers.length > 1 ? 's' : ''}`,
				inline: true
			});

		if (hasSpectators && spectatorsList) {
			embed.addFields(
				{
					name: '\u200B',
					value: '\u200B',
					inline: true
				},
				{
					name: `Spectateurs :`,
					value: `${spectatorsList}\n${spectators.length} spectateur${spectators.length > 1 ? 's' : ''}`,
					inline: true
				}
			);
		}

		const buttons = this.buildActionButtons(game.id, 'started');

		return { embeds: [embed], components: [buttons] };
	}

	/**
	 * Construit dynamiquement les boutons en fonction de l'état de la partie
	 * @param gameId L'ID de la partie
	 * @param state L'état actuel ('opened' | 'closed' | 'started')
	 */
	private static buildActionButtons(gameId: number, state: 'opened' | 'closed' | 'started') {
		const row = new ActionRowBuilder<ButtonBuilder>();

		// 1. Bouton "S'inscrire" (Uniquement quand c'est ouvert)
		if (state === 'opened') {
			row.addComponents(
				new ButtonBuilder()
					.setCustomId(`inscription:join:${state}:${gameId}`)
					.setLabel("S'inscrire")
					.setEmoji(emojisV2.alive)
					.setStyle(ButtonStyle.Success)
			);
		}

		// 2. Bouton "Se désinscrire" (Quand c'est ouvert OU fermé, mais pas lancé)
		if (state === 'opened' || state === 'closed') {
			row.addComponents(
				new ButtonBuilder()
					.setCustomId(`inscription:leave:${state}:${gameId}`)
					.setLabel('Se désinscrire')
					.setEmoji(emojisV2.dead)
					.setStyle(ButtonStyle.Danger)
			);
		}

		// 3. Bouton "Spectateur" (Toujours présent dans les 3 états)
		row.addComponents(
			new ButtonBuilder()
				.setCustomId(`inscription:spectate:${state}:${gameId}`)
				.setLabel('Spectateur')
				.setEmoji('👁️')
				.setStyle(ButtonStyle.Secondary)
		);

		return row;
	}

	/**
	 * Construit le message de composition de la partie
	 */
	public static buildCompo(game: GameData, compo: CompoData) {
		const roles = compo.composition || [];
		const sorcieres = roles.filter((r) => r.camp === 'witch');
		const villageois = roles.filter((r) => r.camp === 'villagers');
		const independants = roles.filter((r) => r.camp === 'independent');

		const activePlayers = game.gamePlayers?.filter((p) => !p.isSpectator) || [];

		const container = new ContainerBuilder()
			.setAccentColor(colors.purpleWitch)
			.addTextDisplayComponents(
				new TextDisplayBuilder().setContent(`### ${emojis.purplecheck} Préparation de la partie`),
				new TextDisplayBuilder().setContent(
					`Voici ton panneau de contrôle pour préparer la partie à venir.\n\n` +
						`__Animateur__ : <@${game.gameMaster.discordId}>\n` +
						`__Joueurs__ : ${activePlayers.length} inscrit${activePlayers.length > 1 ? 's' : ''}\n\n` +
						`**__Composition__** *(${roles.length} rôle${roles.length > 1 ? 's' : ''})* :`
				)
			);

		container.addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small));

		// SORCIÈRES - Section avec bouton à droite
		const witchSection = new SectionBuilder()
			.addTextDisplayComponents(
				new TextDisplayBuilder().setContent(`${emojis.witch} **Sorcières** :`),
				new TextDisplayBuilder().setContent(this.formatList(sorcieres))
			)
			.setButtonAccessory((btn) =>
				btn.setCustomId(`compo:button:quickadd:${game.id}:witch`).setEmoji(emojisV2.witch).setStyle(ButtonStyle.Primary)
			);
		container.addSectionComponents(witchSection);

		container.addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small));

		// VILLAGEOIS - Section avec bouton à droite
		const villagerSection = new SectionBuilder()
			.addTextDisplayComponents(
				new TextDisplayBuilder().setContent(`${emojis.villagers} **Villageois** :`),
				new TextDisplayBuilder().setContent(this.formatList(villageois))
			)
			.setButtonAccessory((btn) =>
				btn.setCustomId(`compo:button:quickadd:${game.id}:villagers`).setEmoji(emojisV2.villagers).setStyle(ButtonStyle.Primary)
			);
		container.addSectionComponents(villagerSection);

		container.addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small));

		if (independants.length > 0) {
			// INDÉPENDANTS - Juste du texte, pas de bouton
			container.addTextDisplayComponents(
				new TextDisplayBuilder().setContent(`${emojis.independent} **Indépendants** :`),
				new TextDisplayBuilder().setContent(this.formatList(independants))
			);
			container.addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small));
		}

		// 4. Construction des boutons de navigation
		const buttonsRow = this.buildButtons(game.id);

		return {
			components: [container, buttonsRow]
		};
	}

	/**
	 * Lit un message existant pour extraire la limite de joueurs et le timestamp de fin.
	 */
	public static extractGameMetaFromMessage(message: Message | null) {
		let maxPlayers: number | null = null;
		let closeTimestamp: number | null = null;

		if (!message || message.embeds.length === 0) return { maxPlayers, closeTimestamp };

		const embed = message.embeds[0];

		for (const field of embed.fields) {
			// Extraction du maxPlayers (Ex: "12/15 inscrits")
			if (field.name === 'Liste des joueurs :') {
				const match = field.value.match(/\/(\d+)\s+inscrit/);
				if (match) maxPlayers = parseInt(match[1], 10);
			}

			// Extraction du timestamp (Ex: "-# Fermeture des inscriptions <t:1234567890:R>")
			if (field.value.includes('Fermeture des inscriptions')) {
				const match = field.value.match(/<t:(\d+):R>/);
				if (match) closeTimestamp = parseInt(match[1], 10);
			}
		}

		return { maxPlayers, closeTimestamp };
	}

	/**
	 * Formatage des listes de rôles
	 */
	private static formatList = (list: RoleInterface[]) => {
		if (list.length === 0) return '> *Aucun*';

		// 1. Liste des rôles avec numérotation (1. 2. 3.) et alignements
		const rolesListText = list
			.map((r, index) => {
				const alignsText = r.alignments?.length ? `   »   [ *${r.alignments.map((a) => getAlignmentLabel(a)).join(', ')}* ]` : '';
				return `**${index + 1}.** ${r.name}${alignsText}`;
			})
			.join('\n');

		// 2. Calcul du récapitulatif des alignements
		const alignmentCounts: Record<string, number> = {};
		list.forEach((role) => {
			if (role.alignments) {
				role.alignments.forEach((align) => {
					alignmentCounts[align] = (alignmentCounts[align] || 0) + 1;
				});
			}
		});

		// 3. Formatage du récapitulatif
		const summaryEntries = Object.entries(alignmentCounts).map(([align, count]) => {
			const label = getAlignmentLabel(align as Alignment);
			return `**${count}** ${count > 1 ? label + 's' : label}`;
		});

		const summaryText = summaryEntries.length > 0 ? `\n\n*Récap : ${summaryEntries.join(', ')}*` : '';

		return rolesListText + summaryText;
	};

	/**
	 * Boutons en bas du message
	 */
	private static buildButtons(gameId: number): ActionRowBuilder<ButtonBuilder> {
		return new ActionRowBuilder<ButtonBuilder>().addComponents(
			new ButtonBuilder().setCustomId(`compo:button:add:${gameId}:witch`).setEmoji(emojisV2.witch).setStyle(ButtonStyle.Success),
			new ButtonBuilder().setCustomId(`compo:button:add:${gameId}:villagers`).setEmoji(emojisV2.villagers).setStyle(ButtonStyle.Success),
			new ButtonBuilder().setCustomId(`compo:button:add:${gameId}:independent`).setEmoji(emojisV2.independent).setStyle(ButtonStyle.Success),

			new ButtonBuilder().setCustomId(`compo:button:delete:${gameId}`).setEmoji('🗑️').setStyle(ButtonStyle.Danger),
			new ButtonBuilder().setCustomId(`compo:button:reset:${gameId}`).setEmoji('🔄').setStyle(ButtonStyle.Danger)
		);
	}
}
