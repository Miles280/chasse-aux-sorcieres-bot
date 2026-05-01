import { ApplyOptions } from '@sapphire/decorators';
import { InteractionHandler, InteractionHandlerTypes } from '@sapphire/framework';
import { ActionRowBuilder, ButtonInteraction, ChannelSelectMenuBuilder, MessageFlags, RoleSelectMenuBuilder, ChannelType } from 'discord.js';

@ApplyOptions<InteractionHandler.Options>({
	interactionHandlerType: InteractionHandlerTypes.Button
})
export class ConfigButtonHandler extends InteractionHandler {
	public override parse(interaction: ButtonInteraction) {
		return interaction.customId.startsWith('config:edit:') ? this.some() : this.none();
	}

	public async run(interaction: ButtonInteraction) {
		const [, , type, field] = interaction.customId.split(':');
		const messageId = interaction.message.id;

		const row = new ActionRowBuilder<RoleSelectMenuBuilder | ChannelSelectMenuBuilder>();

		const channelTypes = field.toLowerCase().includes('category')
			? [ChannelType.GuildCategory]
			: field.toLowerCase().includes('voice')
				? [ChannelType.GuildVoice]
				: [ChannelType.GuildText];

		const customId = `config:select:${field}:${messageId}`;

		if (type === 'role') {
			row.addComponents(new RoleSelectMenuBuilder().setCustomId(customId).setPlaceholder('Sélectionnez un rôle...'));
		} else {
			row.addComponents(
				new ChannelSelectMenuBuilder()
					.setCustomId(customId)
					.setPlaceholder('Sélectionnez un salon ou une catégorie...')
					.setChannelTypes(channelTypes)
			);
		}

		return interaction.reply({
			components: [row],
			flags: [MessageFlags.Ephemeral]
		});
	}
}
