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
			builder.setName(this.name).setDescription(this.description).setContexts([InteractionContextType.Guild])
		);
	}

	public override async chatInputRun(interaction: Command.ChatInputCommandInteraction) {
		// Demande à l'API les informations de l'inventaire du membre
		const response = await container.inventoryService.getUserInventory(interaction.user.id);

		// Gestion d'erreur AVANT le builder
		if (!response.success) {
			return interaction.reply({
				embeds: [Embeds.errorEmbed({ message: response.error })],
				flags: [MessageFlags.Ephemeral]
			});
		}

		// Vérification que le membre est sur le serveur (pour pouvoir afficher l'utilisateur dans l'embed)
		const member = await container.discordService.fetchMemberOrReply(interaction.guild, interaction.user.id, interaction);
		if (!member) return;

		// Création et envoie de l'embed final
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
