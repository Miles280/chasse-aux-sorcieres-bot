import { ApplyOptions } from '@sapphire/decorators';
import { Subcommand } from '@sapphire/plugin-subcommands';
import { container } from '@sapphire/framework';
import { InteractionContextType, MessageFlags } from 'discord.js';
import * as Embeds from '../../utils/embeds';

@ApplyOptions<Subcommand.Options>({
	name: 'inventaireadmin',
	description: "Gestion de l'inventaire des joueurs.",
	subcommands: [
		{ name: 'add', chatInputRun: 'chatInputAdd' },
		{ name: 'remove', chatInputRun: 'chatInputRemove' }
	]
})
export class InventaireAdminCommand extends Subcommand {
	public override registerApplicationCommands(registry: Subcommand.Registry) {
		registry.registerChatInputCommand((builder) =>
			builder
				.setName(this.name)
				.setDescription(this.description)
				.setContexts([InteractionContextType.Guild])

				.addSubcommand((sub) =>
					sub
						.setName('add')
						.setDescription("Ajoute un item à l'inventaire d'un joueur.")
						.addUserOption((opt) =>
							opt //
								.setName('membre')
								.setDescription('Le joueur concerné.')
								.setRequired(true)
						)
						.addStringOption((opt) =>
							opt //
								.setName('item')
								.setDescription("L'item à ajouter.")
								.setAutocomplete(true)
								.setRequired(true)
						)
				)

				.addSubcommand((sub) =>
					sub
						.setName('remove')
						.setDescription("Retire un item de l'inventaire d'un joueur.")
						.addUserOption((opt) =>
							opt //
								.setName('membre')
								.setDescription('Le joueur concerné.')
								.setRequired(true)
						)
						.addStringOption((opt) =>
							opt //
								.setName('item')
								.setDescription("L'item à retirer.")
								.setAutocomplete(true)
								.setRequired(true)
						)
				)
		);
	}

	public async chatInputAdd(interaction: Subcommand.ChatInputCommandInteraction) {
		const target = interaction.options.getUser('membre')!;
		const itemId = Number(interaction.options.getString('item'));

		const response = await container.inventoryService.manageItem(target.id, itemId, 'add');

		if (!response.success) {
			return interaction.reply({
				embeds: [Embeds.errorEmbed({ message: response.error })],
				flags: MessageFlags.Ephemeral
			});
		}

		return interaction.reply({
			embeds: [Embeds.successEmbed({ title: 'Changement effectué', message: response.data.message })]
		});
	}

	public async chatInputRemove(interaction: Subcommand.ChatInputCommandInteraction) {
		const target = interaction.options.getUser('membre')!;
		const itemId = Number(interaction.options.getString('item'));

		const response = await container.inventoryService.manageItem(target.id, itemId, 'remove');

		if (!response.success) {
			return interaction.reply({
				embeds: [Embeds.errorEmbed({ message: response.error })],
				flags: MessageFlags.Ephemeral
			});
		}

		return interaction.reply({
			embeds: [Embeds.successEmbed({ title: 'Changement effectué', message: response.data.message })]
		});
	}
}
