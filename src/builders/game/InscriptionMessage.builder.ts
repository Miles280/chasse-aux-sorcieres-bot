import { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import { GameData } from '../../models/Game.interface';
import { colors } from '../../utils/customColors';
import { emojis } from '../../utils/emojis';

export class InscriptionMessageBuilder {
	public static buildOpened(game: GameData, inscriptionVocId: string, maxPlayers: number | null, remainingTimeMinutes: number | null) {
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
		if (remainingTimeMinutes) {
			const unixTimestamp = Math.floor(Date.now() / 1000) + remainingTimeMinutes * 60;
			embed.addFields({ name: '\u200B', value: `-# Fermeture des inscriptions <t:${unixTimestamp}:R>.`, inline: false });
		}

		const buttons = this.buildActionButtons(game.id, 'open');

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
	public static buildPlaying(game: GameData) {
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

		const buttons = this.buildActionButtons(game.id, 'playing');

		return { embeds: [embed], components: [buttons] };
	}

	/**
	 * Construit dynamiquement les boutons en fonction de l'état de la partie
	 * @param gameId L'ID de la partie
	 * @param state L'état actuel ('open' | 'CLOSED' | 'PLAYING')
	 */
	private static buildActionButtons(gameId: number, state: 'open' | 'closed' | 'playing') {
		const row = new ActionRowBuilder<ButtonBuilder>();

		// 1. Bouton "S'inscrire" (Uniquement quand c'est ouvert)
		if (state === 'open') {
			row.addComponents(new ButtonBuilder().setCustomId(`game:join:${state}:${gameId}`).setLabel("S'inscrire").setStyle(ButtonStyle.Success));
		}

		// 2. Bouton "Se désinscrire" (Quand c'est ouvert OU fermé, mais pas lancé)
		if (state === 'open' || state === 'closed') {
			row.addComponents(
				new ButtonBuilder().setCustomId(`game:leave:${state}:${gameId}`).setLabel('Se désinscrire').setStyle(ButtonStyle.Danger)
			);
		}

		// 3. Bouton "Spectateur" (Toujours présent dans les 3 états)
		row.addComponents(
			new ButtonBuilder().setCustomId(`game:spectate:${state}:${gameId}`).setLabel('Spectateur').setEmoji('👁️').setStyle(ButtonStyle.Secondary)
		);

		return row;
	}
}
