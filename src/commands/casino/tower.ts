import { ApplyOptions } from '@sapphire/decorators';
import { Command } from '@sapphire/framework';
import { container } from '@sapphire/framework';
import { InteractionContextType } from 'discord.js';

@ApplyOptions<Command.Options>({
	name: 'tower',
	description: 'Jouez à la Tour pour multiplier vos Rubis !'
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

		// 1. Vérifier si le joueur a assez de Rubis via l'API
		// const userProfile = await container.shopService.getUser(interaction.user.id);
		// if (userProfile.rubies < bet) return interaction.reply({ content: "Pas assez de rubis !", ephemeral: true });

		// 2. Déduire la mise immédiatement (important pour éviter les glitchs)
		// await container.shopService.removeCurrency(interaction.user.id, 'rubies', bet);

		// 3. Lancer le jeu
		await container.towerService.createGame(interaction, bet);
	}
}
