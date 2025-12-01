import { ApplyOptions } from '@sapphire/decorators';
import { Command } from '@sapphire/framework';
import { container } from '@sapphire/framework';
import { Currency } from '../enums/Currency';
import { MessageFlags } from 'discord.js';
import * as Embeds from '../utils/embeds';

@ApplyOptions<Command.Options>({
	name: 'boutique',
	description: 'Consulte la boutique.'
})
export class UserCommand extends Command {
	public override registerApplicationCommands(registry: Command.Registry) {
		registry.registerChatInputCommand((builder) =>
			builder
				.setName(this.name)
				.setDescription(this.description)
				.addStringOption((opt) =>
					opt //
						.setName('monnaie')
						.setDescription('Choisissez si vous voulez voir les articles à acheter avec des Gemmes ou des Rubis.')
						.addChoices({ name: 'Gemme', value: 'gems' }, { name: 'Rubis', value: 'rubies' })
				)
				.addIntegerOption((opt) =>
					opt //
						.setName('page')
						.setDescription('La page de la boutique à consulter.')
						.setMinValue(1)
				)
		);
	}

	public override async chatInputRun(interaction: Command.ChatInputCommandInteraction) {
		const currency = (interaction.options.getString('monnaie') as Currency) ?? 'gems';
		const page = interaction.options.getInteger('page') ?? 1;

		await interaction.deferReply();

		const response = await container.shopService.buildShopView(currency, page);

		if (response.error) {
			await interaction.editReply({
				embeds: [Embeds.errorEmbed({ title: 'Boutique fermée !', message: response.error })]
			});
			return;
		}

		await interaction.editReply({
			components: response.components,
			flags: MessageFlags.IsComponentsV2
		});
		// disableComponentsAfter(sentMessage, response.components, 5);
	}
}
