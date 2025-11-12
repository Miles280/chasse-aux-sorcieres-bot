import { ApplyOptions } from '@sapphire/decorators';
import { Command } from '@sapphire/framework';
import { InteractionContextType } from 'discord.js';

@ApplyOptions<Command.Options>({
	name: 'historique',
	description: 'Consulte ton historique de transaction ou celle d’un membre.'
})
export class UserCommand extends Command {
	public override registerApplicationCommands(registry: Command.Registry) {
		registry.registerChatInputCommand((builder) =>
			builder //
				.setName(this.name)
				.setDescription(this.description)
				.setContexts([InteractionContextType.Guild])
				.addUserOption((option) =>
					option //
						.setName('membre')
						.setDescription('Le membre concerné par cette action.')
				)
		);
	}

	public override async chatInputRun(interaction: Command.ChatInputCommandInteraction) {
		return interaction.reply({ content: 'Tiens tes transactions bro' });
	}
}
