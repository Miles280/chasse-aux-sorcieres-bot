import { ApplyOptions } from '@sapphire/decorators';
import { container } from '@sapphire/framework';
import { GuildMember, InteractionContextType, MessageFlags, PermissionFlagsBits } from 'discord.js';
import { Subcommand } from '@sapphire/plugin-subcommands';
import { Currency } from '../../enums/Currency';
import * as Embeds from '../../utils/embeds';

@ApplyOptions<Subcommand.Options>({
	name: 'bourseadmin',
	description: 'Gestion avancée de la bourse.',
	subcommands: [
		{ name: 'add', chatInputRun: 'chatInputAdd' },
		{ name: 'remove', chatInputRun: 'chatInputRemove' },
		{ name: 'set', chatInputRun: 'chatInputSet' }
	]
})
export class BourseCommand extends Subcommand {
	public override registerApplicationCommands(registry: Subcommand.Registry) {
		registry.registerChatInputCommand((builder) =>
			builder //
				.setName(this.name)
				.setDescription(this.description)
				.setContexts([InteractionContextType.Guild])
				.setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels)
				.addSubcommand((sub) =>
					sub // ADD
						.setName('add')
						.setDescription('Ajoute de la monnaie à un membre.')
						.addUserOption((opt) =>
							opt //
								.setName('membre')
								.setDescription('Le membre concerné par cette action.')
								.setRequired(true)
						)
						.addStringOption((opt) =>
							opt //
								.setName('monnaie')
								.setDescription('La monnaie à manipuler.')
								.addChoices({ name: 'Gemme', value: 'gems' }, { name: 'Rubis', value: 'rubies' })
								.setRequired(true)
						)
						.addNumberOption((opt) =>
							opt //
								.setName('valeur')
								.setDescription('Le montant à ajouter.')
								.setMinValue(1)
								.setRequired(true)
						)
				)
				.addSubcommand((sub) =>
					sub // REMOVE
						.setName('remove')
						.setDescription('Retire de la monnaie d’un membre.')
						.addUserOption((opt) =>
							opt //
								.setName('membre')
								.setDescription('Le membre concerné par cette action.')
								.setRequired(true)
						)
						.addStringOption((opt) =>
							opt //
								.setName('monnaie')
								.setDescription('La monnaie à manipuler.')
								.addChoices({ name: 'Gemme', value: 'gems' }, { name: 'Rubis', value: 'rubies' })
								.setRequired(true)
						)
						.addNumberOption((opt) =>
							opt //
								.setName('valeur')
								.setDescription('Le montant à retirer.')
								.setMinValue(1)
								.setRequired(true)
						)
				)
				.addSubcommand((sub) =>
					sub // SET
						.setName('set')
						.setDescription('Définit la quantité exacte de monnaie d’un membre.')
						.addUserOption((opt) =>
							opt //
								.setName('membre')
								.setDescription('Le membre concerné par cette action.')
								.setRequired(true)
						)
						.addStringOption((opt) =>
							opt //
								.setName('monnaie')
								.setDescription('La monnaie à manipuler.')
								.addChoices({ name: 'Gemme', value: 'gems' }, { name: 'Rubis', value: 'rubies' })
								.setRequired(true)
						)
						.addNumberOption((opt) =>
							opt //
								.setName('valeur')
								.setDescription('Le montant à fixer.')
								.setRequired(true)
						)
				)
		);
	}

	public async chatInputAdd(interaction: Subcommand.ChatInputCommandInteraction) {
		try {
			const targetId = interaction.options.getUser('membre')!.id;
			const currency = interaction.options.getString('monnaie')! as Currency;
			const amount = interaction.options.getNumber('valeur')!;

			// Envoie à l'API toutes les informations pour qu'elle fasse le nécessaire
			const response = await container.economyService.add(targetId, currency, amount);
			if (!response.success) {
				await interaction.reply({
					embeds: [Embeds.errorEmbed({ member: interaction.member as GuildMember, title: 'Transaction échouée', message: response.error })],
					flags: MessageFlags.Ephemeral
				});
				return;
			}

			const { previous, current } = response.data;

			if (!previous || !current) {
				throw new Error('Données de transaction incomplètes.');
			}

			// Réponse affiché sur discord
			const embed = Embeds.economyActionEmbed({
				action: 'add',
				targetId: targetId,
				currency: currency,
				amount: amount,
				update: response.data
			});

			await interaction.reply({ embeds: [embed] });
		} catch (error) {
			console.error(error);
			await interaction.reply({
				embeds: [Embeds.errorEmbed({ message: 'Erreur dans [chatInputAdd].' })],
				flags: MessageFlags.Ephemeral
			});
		}
	}

	public async chatInputRemove(interaction: Subcommand.ChatInputCommandInteraction) {
		try {
			const targetId = interaction.options.getUser('membre')!.id;
			const currency = interaction.options.getString('monnaie')! as Currency;
			const amount = interaction.options.getNumber('valeur')!;

			// Envoie à l'API toutes les informations pour qu'elle fasse le nécessaire
			const response = await container.economyService.remove(targetId, currency, amount);
			if (!response.success) {
				await interaction.reply({
					embeds: [Embeds.errorEmbed({ member: interaction.member as GuildMember, title: 'Transaction échouée', message: response.error })],
					flags: MessageFlags.Ephemeral
				});
				return;
			}

			const { previous, current } = response.data;

			if (!previous || !current) {
				throw new Error('Données de transaction incomplètes.');
			}

			// Réponse affiché sur discord
			const embed = Embeds.economyActionEmbed({
				action: 'remove',
				targetId: targetId,
				currency: currency,
				amount: amount,
				update: response.data
			});

			await interaction.reply({ embeds: [embed] });
		} catch (error) {
			console.error(error);
			await interaction.reply({
				embeds: [Embeds.errorEmbed({ message: 'Erreur dans [chatInputRemove].' })],
				flags: MessageFlags.Ephemeral
			});
		}
	}

	public async chatInputSet(interaction: Subcommand.ChatInputCommandInteraction) {
		try {
			const targetId = interaction.options.getUser('membre')!.id;
			const currency = interaction.options.getString('monnaie')! as Currency;
			const amount = interaction.options.getNumber('valeur')!;

			// Envoie à l'API toutes les informations pour qu'elle fasse le nécessaire
			const response = await container.economyService.set(targetId, currency, amount);
			if (!response.success) {
				await interaction.reply({
					embeds: [Embeds.errorEmbed({ member: interaction.member as GuildMember, title: 'Transaction échouée', message: response.error })],
					flags: MessageFlags.Ephemeral
				});
				return;
			}

			const { previous, current } = response.data;

			if (!previous || !current) {
				throw new Error('Données de transaction incomplètes.');
			}

			// Réponse affiché sur discord
			const embed = Embeds.economyActionEmbed({
				action: 'set',
				targetId: targetId,
				currency: currency,
				amount: amount,
				update: response.data
			});

			await interaction.reply({ embeds: [embed] });
		} catch (error) {
			console.error(error);
			await interaction.reply({
				embeds: [Embeds.errorEmbed({ message: 'Erreur dans [chatInputSet].' })],
				flags: MessageFlags.Ephemeral
			});
		}
	}
}
