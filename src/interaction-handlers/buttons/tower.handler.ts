import { ApplyOptions } from '@sapphire/decorators';
import { InteractionHandler, InteractionHandlerTypes, container } from '@sapphire/framework';
import { ButtonInteraction, MessageFlags } from 'discord.js';

@ApplyOptions<InteractionHandler.Options>({
	interactionHandlerType: InteractionHandlerTypes.Button
})
export class TowerHandler extends InteractionHandler {
	public override parse(interaction: ButtonInteraction) {
		// On écoute tout ce qui commence par "tower_"
		if (!interaction.customId.startsWith('tower_')) return this.none();
		return this.some();
	}

	public async run(interaction: ButtonInteraction) {
		// ex: tower_play_0 ou tower_stop
		const [, action, value] = interaction.customId.split('_');

		let choice: number | 'stop';

		if (action === 'stop') {
			choice = 'stop';
		} else {
			choice = parseInt(value);
		}

		// On appelle le Service en lui passant l'ID du message (qui sert d'ID de session)
		const result = await container.towerService.handleInput(interaction.message.id, interaction.user.id, choice);

		if (result.error) {
			return interaction.reply({ content: result.error, flags: MessageFlags.Ephemeral });
		}

		// On met à jour l'interface
		return interaction.update({ ...result.payload });
	}
}
