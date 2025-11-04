import { ApplyOptions } from '@sapphire/decorators';
import { Command, container } from '@sapphire/framework';
import { balanceEmbed } from '../embeds/economyEmbeds';
import { MessageFlags } from 'discord.js';

@ApplyOptions<Command.Options>({
	description: 'Affiche votre bourse (gemmes et rubis)'
})
export class BourseCommand extends Command {
	public override registerApplicationCommands(registry: Command.Registry) {
		registry.registerChatInputCommand((builder) =>
			builder //
				.setName(this.name)
				.setDescription(this.description)
		);
	}

	public override async chatInputRun(interaction: Command.ChatInputCommandInteraction) {
		try {
			const user = await container.economyService.getBalance();

			if (!user) {
				await interaction.reply({ content: 'Impossible de récupérer votre bourse.', flags: MessageFlags.Ephemeral });
				return;
			}

			const embed = balanceEmbed(interaction.user.displayName, user.gems, user.rubies);
			await interaction.reply({ embeds: [embed] });
		} catch (error) {
			console.error(error);
			await interaction.reply({ content: 'Impossible de récupérer votre bourse. 2', flags: MessageFlags.Ephemeral });
		}
	}
}
