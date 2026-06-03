import { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } from 'discord.js';
import { RoleDistribution } from '../../models/Game.interface';
import { emojis } from '../../utils/emojis';
import { colors } from '../../utils/customColors';

export class GameMessageBuilder {
	/**
	 * Construit le message de preview de lancement
	 */
	public static buildPreview(gameId: number, gameMode: string, distribution: RoleDistribution[]) {
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
}
