import { ApplyOptions } from '@sapphire/decorators';
import { container } from '@sapphire/framework';
import { bourseEmbed } from '../embeds/economyEmbeds';
import { InteractionContextType, MessageFlags } from 'discord.js';
import { formatTransactions } from '../utils/formatTransactions';
import { Subcommand } from '@sapphire/plugin-subcommands';

@ApplyOptions<Subcommand.Options>({
	name: 'bourse',
	description: 'Gestion de la bourse',
	subcommands: [
		{ name: 'view', chatInputRun: 'chatInputView' },
		{ name: 'add', chatInputRun: 'chatInputAdd' },
		{ name: 'remove', chatInputRun: 'chatInputRemove' }
	]
})
export class BourseCommand extends Subcommand {
	public override registerApplicationCommands(registry: Subcommand.Registry) {
		registry.registerChatInputCommand((builder) =>
			builder //
				.setName(this.name)
				.setDescription(this.description)
				.setContexts([InteractionContextType.Guild])
				.addSubcommand((sub) =>
					sub //
						.setName('view')
						.setDescription("Consulte ta bourse ou celle d'un autre membre.")
						.addUserOption((option) =>
							option //
								.setName('membre')
								.setDescription('Le membre à consulter')
								.setRequired(false)
						)
				)
		);
	}

	public async chatInputView(interaction: Subcommand.ChatInputCommandInteraction) {
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
