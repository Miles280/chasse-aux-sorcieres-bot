import { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, Message } from 'discord.js';
import { GameData } from '../../models/Game.interface';
import { colors } from '../../utils/customColors';
import { emojis, emojisV2 } from '../../utils/emojis';

export class InscriptionMessageBuilder {
	public static buildOpened(game: GameData, inscriptionVocId: string, maxPlayers: number | null, closeTimestamp: number | null) {
		// Formatage du compteur max
		const limitText = maxPlayers ? `/${maxPlayers}` : '';

		// Listes (avec fallback si vide)
		const playersList = game.players?.length > 0 ? game.players.map((id) => `> <@${id}>`).join('\n') : '> *Aucun inscrit*';

		// On suppose que l'API renvoie un tableau de spectateurs
		const hasSpectators = game.spectators && game.spectators.length > 0;
		const spectatorsList = hasSpectators ? game.spectators.map((id) => `> <@${id}>`).join('\n') : null;

		const embed = new EmbedBuilder()
			.setColor(colors.purpleWitch)
			.setTitle(`${emojis.purplecheck} Inscriptions ouvertes !`)
			.setDescription(
				`Le brouillard se lève sur Nistrium... Inscrira-tu ton nom au registre ou préféreras-tu observer le chaos depuis les ombres ?\n\n` +
					`__Animateur__ : <@${game.gameMasterId}>\n` +
					`__Vocal d'attente__ : <#${inscriptionVocId}>\n` +
					`\u200B`
			)
			.setThumbnail(
				'https://cdn.discordapp.com/attachments/1452366108765061172/1452465270802354298/Chapo.png?ex=69e22e72&is=69e0dcf2&hm=447360bcbb9363a1f14ae1bb34b47257833a8dfb12056c28dc82e5ea3db5df2c&'
			)
			.addFields({
				name: `Liste des joueurs :`,
				value: `${playersList}\n${game.players?.length || 0}${limitText} inscrit${game.players?.length > 1 ? 's' : ''}`,
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
					value: `${spectatorsList}\n${game.spectators.length} spectateur${game.spectators.length > 1 ? 's' : ''}`,
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
		// Listes (avec fallback si vide)
		const playersList = game.players?.length > 0 ? game.players.map((id) => `> <@${id}>`).join('\n') : '> *Aucun inscrit*';

		// On suppose que l'API renvoie un tableau de spectateurs
		const hasSpectators = game.spectators && game.spectators.length > 0;
		const spectatorsList = hasSpectators ? game.spectators.map((id) => `> <@${id}>`).join('\n') : null;

		const embed = new EmbedBuilder()
			.setColor(colors.orange)
			.setTitle(`${emojis.orangecheck} Inscriptions fermées !`)
			.setDescription(
				`Le portail de Nistrium s'est refermé. Le sort en est jeté, et les joueurs sont désormais scellés dans cette partie.\n\n` +
					`__Animateur__ : <@${game.gameMasterId}>\n` +
					`__Vocal d'attente__ : <#${inscriptionVocId}>\n` +
					`\u200B`
			)
			.setThumbnail(
				'https://cdn.discordapp.com/attachments/1452366108765061172/1452465270802354298/Chapo.png?ex=69e22e72&is=69e0dcf2&hm=447360bcbb9363a1f14ae1bb34b47257833a8dfb12056c28dc82e5ea3db5df2c&'
			)
			.addFields({
				name: `Liste des joueurs :`,
				value: `${playersList}\n${game.players?.length || 0} inscrit${game.players?.length > 1 ? 's' : ''}`,
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
					value: `${spectatorsList}\n${game.spectators.length} spectateur${game.spectators.length > 1 ? 's' : ''}`,
					inline: true
				}
			);
		}

		const buttons = this.buildActionButtons(game.id, 'closed');

		return { embeds: [embed], components: [buttons] };
	}

	/**
	 * Construit le message d'inscription quand la partie est lancé
	 */
	public static buildStarted(game: GameData) {
		// Listes (avec fallback si vide)
		const playersList = game.players?.length > 0 ? game.players.map((id) => `> <@${id}>`).join('\n') : '> *Aucun inscrit*';

		// On suppose que l'API renvoie un tableau de spectateurs
		const hasSpectators = game.spectators && game.spectators.length > 0;
		const spectatorsList = hasSpectators ? game.spectators.map((id) => `> <@${id}>`).join('\n') : null;

		const embed = new EmbedBuilder()
			.setColor(colors.orange)
			.setTitle(`${emojis.orangecheck} Inscriptions fermées !`)
			.setDescription(
				`Le portail de Nistrium s'est refermé. Le sort en est jeté, et les joueurs sont désormais scellés dans cette partie.\n\n` +
					`__Animateur__ : <@${game.gameMasterId}>\n` +
					`__Status __ : **Partie en cours...**\n` +
					`\u200B`
			)
			.setThumbnail(
				'https://cdn.discordapp.com/attachments/1452366108765061172/1452465270802354298/Chapo.png?ex=69e22e72&is=69e0dcf2&hm=447360bcbb9363a1f14ae1bb34b47257833a8dfb12056c28dc82e5ea3db5df2c&'
			)
			.addFields({
				name: `Liste des joueurs :`,
				value: `${playersList}\n${game.players?.length || 0} inscrit${game.players?.length > 1 ? 's' : ''}`,
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
					value: `${spectatorsList}\n${game.spectators.length} spectateur${game.spectators.length > 1 ? 's' : ''}`,
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
	public static buildCompo(game: GameData) {
		const embed = new EmbedBuilder()
			.setColor(colors.purpleWitch)
			.setTitle(`${emojis.purplecheck} Préparation de la partie`)
			.setDescription(
				`Voici ton pannel de contrôle pour préparer la partie à venir.\n\n` +
					`__Animateur__ : <@${game.gameMasterId}>\n` +
					`__Joueurs__ : ${game.players?.length || 0} inscrit${game.players?.length > 1 ? 's' : ''}` +
					`\u200B`
			);

		return { embeds: [embed], components: [] };
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
}
