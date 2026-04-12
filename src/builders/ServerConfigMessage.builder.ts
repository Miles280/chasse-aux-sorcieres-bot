import { ButtonStyle, ContainerBuilder, TextDisplayBuilder, SectionBuilder, SeparatorBuilder, SeparatorSpacingSize } from 'discord.js';
import { ServerConfig } from '../models/ServerConfig.interface';
import { colors } from '../utils/customColors';
import { emojis } from '../utils/emojis';

export class ServerConfigMessageBuilder {
	public static build(config: ServerConfig) {
		const container = new ContainerBuilder()
			.setAccentColor(colors.purpleWitch)
			.addTextDisplayComponents(
				new TextDisplayBuilder().setContent(`### ⚙️ __Configuration du Serveur__\nGérez les rôles et salons pour vos parties.`)
			);

		const fields = [
			{ id: 'mjRoleId', name: 'Rôle MJ', type: 'role' },
			{ id: 'playerRoleId', name: 'Rôle Joueur', type: 'role' },
			{ id: 'deadPlayerRoleId', name: 'Rôle Joueur Mort', type: 'role' },
			{ id: 'inscriptionVoiceChannelId', name: 'Vocal Inscription', type: 'channel' },
			{ id: 'gameVoiceChannelId', name: 'Vocal Partie', type: 'channel' },
			{ id: 'deadVoiceChannelId', name: 'Vocal Morts', type: 'channel' },
			{ id: 'inscriptionChannelId', name: 'Salon Inscription', type: 'channel' },
			{ id: 'gameMjChannelId', name: 'Salon MJ', type: 'channel' },
			{ id: 'gameCategoryId', name: 'Catégorie des parties', type: 'channel' },
			{ id: 'gamePrivateCategoryId', name: 'Catégorie fiche privée', type: 'channel' }
		];

		for (let i = 0; i < fields.length; i++) {
			const field = fields[i];
			const val = config[field.id as keyof ServerConfig];

			// 1. Un séparateur au dessus du Rôle MJ (index 0)
			if (i === 0) {
				container.addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small));
			}

			// Ajout de la section actuelle
			container.addSectionComponents(this.buildConfigSection(field.id, field.name, field.type, val as string));

			// 2. Un en dessous de Rôle Joueur Mort (index 2)
			if (field.id === 'deadPlayerRoleId') {
				container.addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small));
			}

			// 3. Un en dessous de Vocal Morts (index 5)
			if (field.id === 'deadVoiceChannelId') {
				container.addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small));
			}

			// 4. Un en dessous de Salon MJ (index 7)
			if (field.id === 'gameMjChannelId') {
				container.addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small));
			}
		}

		// 5. Un dernier tout en bas
		container.addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small));

		return { components: [container] };
	}

	private static buildConfigSection(id: string, name: string, type: string, value: string | null): SectionBuilder {
		const displayValue = value
			? type === 'role'
				? `${emojis.check} <@&${value}>`
				: `${emojis.check} <#${value}>`
			: `${emojis.uncheck} *Non défini*`;

		return new SectionBuilder()
			.addTextDisplayComponents(new TextDisplayBuilder().setContent(`**${name}** :\n${displayValue}`))
			.setButtonAccessory((btn) => btn.setCustomId(`config:edit:${type}:${id}`).setLabel('Modifier').setStyle(ButtonStyle.Secondary));
	}
}
