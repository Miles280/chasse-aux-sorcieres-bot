import { ApplyOptions } from '@sapphire/decorators';
import { Command } from '@sapphire/framework';
import { container } from '@sapphire/framework';
import { GuildMember, InteractionContextType, MessageFlags } from 'discord.js';
import * as Embeds from '../../utils/embeds';

@ApplyOptions<Command.Options>({
	name: 'tour',
	description: 'Jouez à la Tour de la Fortune pour multiplier vos Rubis !'
})
export class TowerCommand extends Command {
	public override registerApplicationCommands(registry: Command.Registry) {
		registry.registerChatInputCommand((builder) =>
			builder
				.setName(this.name)
				.setDescription(this.description)
				.setContexts([InteractionContextType.Guild])
				.addIntegerOption((opt) => opt.setName('mise').setDescription('Montant de Rubis à miser').setRequired(true).setMinValue(10))
		);
	}

	public override async chatInputRun(interaction: Command.ChatInputCommandInteraction) {
		const bet = interaction.options.getInteger('mise', true);
		const userId = interaction.user.id;

		// 1. Vérifier si le joueur a assez de Rubis via l'API
		const response = await container.economyService.view(userId);
		if (response.error) {
			await interaction.reply({
				embeds: [Embeds.errorEmbed({ member: interaction.member as GuildMember, message: response.error })],
				flags: MessageFlags.Ephemeral
			});
			return;
		}
		const userBalance = response.balance!;
		if (userBalance.rubies < bet) return interaction.reply({ content: 'Pas assez de rubis !', ephemeral: true });

		// 2. Déduire la mise immédiatement (important pour éviter les glitchs)
		const reponseCasino = await container.economyService.casino(userId, bet, 'remove');
		if (reponseCasino.error) {
			await interaction.reply({
				embeds: [Embeds.errorEmbed({ member: interaction.member as GuildMember, message: reponseCasino.error })],
				flags: MessageFlags.Ephemeral
			});
			return;
		}

		// 3. Lancer le jeu
		return container.towerService.createGame(interaction, bet);
	}
}
