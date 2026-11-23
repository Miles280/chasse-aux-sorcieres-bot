import {
	ActionRowBuilder,
	ButtonBuilder,
	ButtonStyle,
	EmbedBuilder,
	Guild,
	StringSelectMenuBuilder,
	StringSelectMenuOptionBuilder
} from 'discord.js';
import { emojis } from '../../utils/emojis';
import { colors } from '../../utils/customColors';
import { GamePlayerInterface, RoleDistribution } from '../../models/game/Game.interface';

export class GameMessageBuilder {
	/**
	 * Construit le message de preview de lancement
	 */
	public static buildPreviewDistribution(gameId: number, gameMode: string, distribution: RoleDistribution[]) {
		const modeMapping: Record<string, string> = {
			classic: 'Classique',
			hidden: 'Compo Cachée',
			neighborhood: 'Quartier résidentiel'
		};
		const displayMode = modeMapping[gameMode] || gameMode;

		const embed = new EmbedBuilder()
			.setTitle(`${emojis.purplecheck} Prévisualisation de la distribution`)
			.setDescription(`__Mode de jeu__ : ${displayMode}`)
			.setColor(colors.purpleWitch);

		const witches: string[] = [];
		const villagers: string[] = [];
		const independents: string[] = [];

		const sortedDistribution = [...distribution].sort((a, b) => {
			// 1er critère : Nombre de joueurs minimum (Décroissant : du plus grand au plus petit)
			if (a.role.minPlayer !== b.role.minPlayer) {
				return a.role.minPlayer - b.role.minPlayer;
			}

			// 2e critère : Nom du rôle (Alphabétique Croissant : A-Z)
			return a.role.name.localeCompare(b.role.name);
		});

		for (const assignment of sortedDistribution) {
			const line = `- ${assignment.role.name}  »  <@${assignment.discordId}>`;
			const camp = assignment.role.camp?.toLowerCase();

			if (camp === 'witch') {
				witches.push(line);
			} else if (camp === 'independent') {
				independents.push(line);
			} else {
				villagers.push(line);
			}
		}

		const finalBlocks: string[] = [];

		if (witches.length > 0) {
			finalBlocks.push(`${emojis.witch} __Sorcières :__\n${witches.join('\n')}`);
		}
		if (villagers.length > 0) {
			finalBlocks.push(`${emojis.villagers} __Villageois :__\n${villagers.join('\n')}`);
		}
		if (independents.length > 0) {
			finalBlocks.push(`${emojis.independent} __Indépendants :__\n${independents.join('\n')}`);
		}

		// On rejoint tous les blocs en insérant une ligne vide (\n\n) entre chaque groupe
		const compoText = finalBlocks.join('\n\n');

		embed.addFields({ name: 'Distribution :', value: compoText || 'Aucun joueur actif.' });

		// Création des boutons
		const buttons = new ActionRowBuilder<ButtonBuilder>().addComponents(
			new ButtonBuilder()
				.setCustomId(`launch:button:validate:${gameId}:${gameMode}`)
				.setLabel('Valider')
				.setEmoji('✅')
				.setStyle(ButtonStyle.Success),
			new ButtonBuilder()
				.setCustomId(`launch:button:reroll:${gameId}:${gameMode}`)
				.setLabel('Reroll')
				.setEmoji('🔄')
				.setStyle(ButtonStyle.Primary)
		);

		return { embeds: [embed], components: [buttons] };
	}

	/**
	 * Construit le message de fin de partie avec le récapitulatif et le bouton de nettoyage.
	 */
	public static buildFinishMessage(gameId: number, winningCampName: string, players: GamePlayerInterface[]) {
		const embed = new EmbedBuilder()
			.setTitle(`🏆 Fin de la Partie #${gameId}`)
			.setDescription(`Le camp **${winningCampName}** a remporté la victoire !`)
			.setColor(colors.purpleWitch);

		let summary = '';
		if (players.length > 0) {
			for (const player of players) {
				if (player.isSpectator) continue;

				const userMention = player.user?.discordId ? `<@${player.user.discordId}>` : 'Joueur inconnu';
				const roleName = player.trueRole?.name ?? 'Rôle non défini';
				const status = player.isAlive ? emojis.alive : emojis.dead;

				summary += `- ${status} ${userMention} : ${roleName}\n`;
			}
		} else {
			summary += `*Aucun joueur trouvé pour cette partie.*`;
		}

		embed.addFields({ name: '📜 Récapitulatif des Joueurs :', value: summary });
		embed.setFooter({ text: `Partie terminée en attente de nettoyage.` });

		const actionRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
			new ButtonBuilder().setCustomId(`game:clean:button:${gameId}`).setLabel('Nettoyer la partie').setStyle(ButtonStyle.Danger).setEmoji('🧹')
		);

		return { embeds: [embed], components: [actionRow] };
	}

	/**
	 * Construit le message pour la Main du Destin (avec ou sans boutons de confirmation MJ).
	 */
	public static buildMainDuDestin(userDiscordId: string, withConfirmation: boolean = true) {
		const description = withConfirmation
			? `La main du destin a désigné <@${userDiscordId}>.\nSouhaitez-vous envoyer ce résultat aux Sorcières ?`
			: `Le destin a frappé : le joueur désigné est <@${userDiscordId}>.`;

		const embed = new EmbedBuilder().setTitle(`${emojis.purplecheck} Main du Destin`).setDescription(description).setColor(colors.purpleWitch);

		if (!withConfirmation) {
			return { embeds: [embed], components: [] };
		}

		const actionRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
			new ButtonBuilder()
				.setCustomId(`main-du-destin:button:confirm:${userDiscordId}`)
				.setLabel('Valider')
				.setStyle(ButtonStyle.Success)
				.setEmoji('✅'),
			new ButtonBuilder().setCustomId(`main-du-destin:button:reroll`).setLabel('Reroll').setStyle(ButtonStyle.Primary).setEmoji('🔄')
		);

		return { embeds: [embed], components: [actionRow] };
	}

	public static buildUrneNoire(players: GamePlayerInterface[], guild: Guild) {
		const embed = new EmbedBuilder()
			.setTitle(`${emojis.purplecheck} Urne Noire`)
			.setDescription("Sélectionnez ci-dessous les joueurs que vous souhaitez ajouter à l'**Urne Noire**.")
			.setColor(colors.purpleWitch);

		const options = players
			.filter((p) => !p.isSpectator && p.user?.discordId)
			.slice(0, 25)
			.map((player) => {
				const discordId = player.user!.discordId;
				const member = guild.members.cache.get(discordId);
				const displayName = member?.displayName!;

				return new StringSelectMenuOptionBuilder().setLabel(displayName).setValue(discordId);
			});

		if (options.length === 0) {
			embed.setDescription('*Aucun joueur disponible à ajouter à l’Urne Noire.*');
			return { embeds: [embed], components: [] };
		}

		const selectMenu = new StringSelectMenuBuilder()
			.setCustomId('urne-noire:select')
			.setPlaceholder("Choisir les membres pour l'Urne Noire...")
			.setMinValues(1)
			.setMaxValues(options.length)
			.addOptions(options);

		const actionRow = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(selectMenu);

		return { embeds: [embed], components: [actionRow] };
	}

	public static buildCulte(players: GamePlayerInterface[], guild: Guild) {
		const eligiblePlayers = players.filter((p) => !p.isSpectator && p.user?.discordId);
		const expectedCount = Math.floor(eligiblePlayers.length / 2);

		const embed = new EmbedBuilder()
			.setTitle(`${emojis.purplecheck} Le Culte`)
			.setDescription(
				`Sélectionnez les joueurs recrutés secrètement dans le **Culte**.\n` +
					`*(Taille recommandée : **${expectedCount}** joueur(s) pour ${eligiblePlayers.length} participants)*`
			)
			.setColor(colors.purpleWitch);

		const options = eligiblePlayers.slice(0, 25).map((player) => {
			const discordId = player.user!.discordId;
			const member = guild.members.cache.get(discordId);
			const displayName = member?.displayName!;

			return new StringSelectMenuOptionBuilder().setLabel(displayName).setValue(discordId);
		});

		if (options.length === 0) {
			embed.setDescription('*Aucun joueur disponible pour le Culte.*');
			return { embeds: [embed], components: [] };
		}

		const selectMenu = new StringSelectMenuBuilder()
			.setCustomId('culte:select')
			.setPlaceholder('Choisir du Culte...')
			.setMinValues(1)
			.setMaxValues(options.length)
			.addOptions(options);

		const actionRow = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(selectMenu);

		return { embeds: [embed], components: [actionRow] };
	}
}
