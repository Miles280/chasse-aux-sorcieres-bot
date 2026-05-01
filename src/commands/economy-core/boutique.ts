import { ApplyOptions } from '@sapphire/decorators';
import { Command } from '@sapphire/framework';
import { container } from '@sapphire/framework';
import { Currency } from '../../enums/Currency';
import { InteractionContextType, MessageFlags } from 'discord.js';
import { ShopMessageBuilder } from '../../builders/economy-core/ShopMessage.builder';
import * as Embeds from '../../utils/embeds';

@ApplyOptions<Command.Options>({
	name: 'boutique',
	description: 'Consulte la boutique.'
})
export class BoutiqueCommand extends Command {
	public override registerApplicationCommands(registry: Command.Registry) {
		registry.registerChatInputCommand((builder) =>
			builder
				.setName(this.name)
				.setDescription(this.description)
				.setContexts([InteractionContextType.Guild])
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

		const response = await container.shopService.getArticles(currency, page);

		if (!response.success) {
			return interaction.reply({
				embeds: [Embeds.errorEmbed({ message: response.error })],
				flags: [MessageFlags.Ephemeral]
			});
		}

		const messageOptions = ShopMessageBuilder.build(currency, page, response.data);

		return interaction.reply({
			...messageOptions,
			flags: [MessageFlags.IsComponentsV2]
		});
	}
}
