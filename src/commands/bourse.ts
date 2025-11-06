import { ApplyOptions } from '@sapphire/decorators';
import { Command, container } from '@sapphire/framework';
import { bourseEmbed } from '../embeds/economyEmbeds';
import { MessageFlags } from 'discord.js';
import { formatTransactions } from '../utils/formatTransactions';

@ApplyOptions<Command.Options>({
	description: 'Affiche votre bourse (gemmes et rubis)'
})
export class BourseCommand extends Command {
	public override registerApplicationCommands(registry: Command.Registry) {
		registry.registerChatInputCommand((builder) =>
			builder //
				.setName(this.name)
				.setDescription(this.description)
				.setDMPermission(false)
				.addUserOption((option) =>
					option //
						.setName('membre')
						.setDescription('Le pseudo du joueur dont vous voulez voir la bourse')
						.setRequired(false)
				)
		);
	}

	public override async chatInputRun(interaction: Command.ChatInputCommandInteraction) {
		try {
			const requestedUser = interaction.options.getUser('membre');
			const discordIdToFetch = requestedUser?.id ?? interaction.user.id;

			const user = await container.economyService.getBalance(discordIdToFetch);

			if (!user) {
				await interaction.reply({ content: 'Impossible de récupérer votre bourse.', flags: MessageFlags.Ephemeral });
				return;
			}

			const member = interaction.guild?.members.cache.get(user.discordId) || (await interaction.guild?.members.fetch(user.discordId));
			if (!member) {
				await interaction.reply({ content: 'Impossible de trouver ce membre sur le serveur.', flags: MessageFlags.Ephemeral });
				return;
			}

			const embed = bourseEmbed({
				member,
				gems: user.gems,
				rubies: user.rubies,
				transactionsText: formatTransactions(user.transactions)
			});
			await interaction.reply({ embeds: [embed] });
		} catch (error) {
			console.error(error);
			await interaction.reply({ content: 'Impossible de récupérer votre bourse. 2', flags: MessageFlags.Ephemeral });
		}
	}
}
