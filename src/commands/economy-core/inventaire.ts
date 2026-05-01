import { ApplyOptions } from '@sapphire/decorators';
import { Command } from '@sapphire/framework';
import { container } from '@sapphire/framework';
import { InteractionContextType, MessageFlags } from 'discord.js';
import * as Embeds from '../../utils/embeds';

@ApplyOptions<Command.Options>({
	name: 'inventaire',
	description: 'Consulte ton inventaire.'
})
export class InventaireCommand extends Command {
	public override registerApplicationCommands(registry: Command.Registry) {
		registry.registerChatInputCommand((builder) =>
			builder
				.setName(this.name)
				.setDescription(this.description)
				.setContexts([InteractionContextType.Guild])
				.addUserOption((opt) =>
					opt //
						.setName('membre')
						.setDescription('Le membre concerné par cette action.')
				)
		);
	}

	public override async chatInputRun(interaction: Command.ChatInputCommandInteraction) {
		// 1. Déterminer quel utilisateur consulter
		const requestedUser = interaction.options.getUser('membre');
		const discordId = requestedUser?.id ?? interaction.user.id;

		// 2. Récupération de l'inventaire via l'API
		const response = await container.inventoryService.getUserInventory(discordId);

		// 3. Gestion des erreurs API
		if (!response.success) {
			return interaction.reply({
				embeds: [Embeds.errorEmbed({ message: response.error })],
				flags: [MessageFlags.Ephemeral]
			});
		}

		// 4. Vérifier que le membre est présent sur le serveur
		const member = await container.discordService.fetchMemberOrReply(interaction.guild, discordId, interaction);
		if (!member) return;

		// 5. Génération de l'embed d'inventaire
		const inventory = response.data;

		const embed = Embeds.inventoryEmbed({
			member,
			inventory: inventory
		});

		return interaction.reply({
			embeds: [embed]
		});
	}
}
