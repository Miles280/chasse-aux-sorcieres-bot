import { ApplyOptions } from '@sapphire/decorators';
import { container } from '@sapphire/framework';
import { InteractionContextType, MessageFlags } from 'discord.js';
import { Subcommand } from '@sapphire/plugin-subcommands';
import * as Embeds from '../../utils/embeds';

@ApplyOptions<Subcommand.Options>({
	name: 'convertir',
	description: 'Converti tes gemmes en rubis.',
	subcommands: [
		{ name: 'gemmes', chatInputRun: 'chatInputGems' },
		{ name: 'taux', chatInputRun: 'chatInputTaux' }
	]
})
export class HistoriqueCommand extends Subcommand {
	public override registerApplicationCommands(registry: Subcommand.Registry) {
		registry.registerChatInputCommand((builder) =>
			builder
				.setName(this.name)
				.setDescription(this.description)
				.setContexts([InteractionContextType.Guild])
				.addSubcommand((sub) =>
					sub
						.setName('gemmes')
						.setDescription('Convertir des gemmes en rubis.')
						.addNumberOption((option) => option.setName('valeur').setDescription('Le montant à convertir.').setRequired(true))
				)

				.addSubcommand((sub) => sub.setName('taux').setDescription('Voir votre taux de conversion actuel.'))
		);
	}

	public async chatInputGems(interaction: Subcommand.ChatInputCommandInteraction) {
		const discordId = interaction.user.id;
		const amount = interaction.options.getNumber('valeur')!;

		const response = await container.economyService.convert(discordId, amount);

		if (!response.success) {
			return interaction.reply({
				embeds: [Embeds.errorEmbed({ message: response.error })],
				flags: [MessageFlags.Ephemeral]
			});
		}

		// Vérification que le membre est sur le serveur (pour pouvoir afficher l'utilisateur dans l'embed)
		const member = await container.discordService.fetchMemberOrReply(interaction.guild, discordId, interaction);
		if (!member) return;

		return interaction.reply({
			embeds: [Embeds.conversionEmbed(member, response.data)]
		});
	}

	public async chatInputTaux(interaction: Subcommand.ChatInputCommandInteraction) {
		const discordId = interaction.user.id;

		const response = await container.economyService.getConversionRate(discordId);

		if (!response.success) {
			return interaction.reply({
				embeds: [Embeds.errorEmbed({ message: response.error })],
				flags: [MessageFlags.Ephemeral]
			});
		}

		// Vérification membre
		const member = await container.discordService.fetchMemberOrReply(interaction.guild, discordId, interaction);
		if (!member) return;

		return interaction.reply({
			embeds: [Embeds.conversionRateEmbed(member, response.data)]
		});
	}
}
