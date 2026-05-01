import { ApplyOptions } from '@sapphire/decorators';
import { InteractionHandler, InteractionHandlerTypes, container } from '@sapphire/framework';
import { MessageFlags, type AnySelectMenuInteraction } from 'discord.js';
import { ServerConfigMessageBuilder } from '../builders/ServerConfigMessage.builder';
import * as Embeds from '../utils/embeds';

@ApplyOptions<InteractionHandler.Options>({
	interactionHandlerType: InteractionHandlerTypes.SelectMenu
})
export class ConfigSelectHandler extends InteractionHandler {
	public override parse(interaction: AnySelectMenuInteraction) {
		return interaction.customId.startsWith('config:select:') ? this.some() : this.none();
	}

	public async run(interaction: AnySelectMenuInteraction) {
		const [, , field, targetMessageId] = interaction.customId.split(':');
		const newValue = interaction.values[0];
		const guildId = interaction.guildId!;

		// 1. On update l'éphémère pour dire qu'on travaille
		await interaction.deferUpdate();

		// 2. Update API
		await container.serverConfigService.updateConfig(guildId, { [field]: newValue });

		// 3. Récupération des nouvelles datas
		const response = await container.serverConfigService.getConfig(guildId);

		if (!response.success) {
			return interaction.editReply({
				embeds: [Embeds.errorEmbed({ title: 'Erreur', message: "Impossible de joindre l'API." })]
			});
		}

		// 4. Update du message d'origine (le panneau)
		await interaction.webhook.editMessage(targetMessageId, {
			components: ServerConfigMessageBuilder.build(response.data).components,
			flags: [MessageFlags.IsComponentsV2]
		});

		// 5. On supprime le menu éphémère de choix
		return interaction.deleteReply();
	}
}
