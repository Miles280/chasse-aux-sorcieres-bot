import { ApplyOptions } from '@sapphire/decorators';
import { container } from '@sapphire/framework';
import { GuildMember, InteractionContextType, MessageFlags } from 'discord.js';
import { formatTransactions } from '../../utils/formatTransactions';
import { Subcommand } from '@sapphire/plugin-subcommands';
import { Currency } from '../../enums/Currency';
import * as Embeds from '../../utils/embeds';

@ApplyOptions<Subcommand.Options>({
	name: 'bourse',
	description: 'Gestion de la bourse.',
	subcommands: [
		{ name: 'view', chatInputRun: 'chatInputView' },
		{ name: 'give', chatInputRun: 'chatInputGive' },
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
				.addSubcommand((sub) =>
					sub // VIEW
						.setName('view')
						.setDescription('Consulte ta bourse ou celle d’un membre.')
						.addUserOption((option) =>
							option //
								.setName('membre')
								.setDescription('Le membre concerné par cette action.')
						)
				)
				.addSubcommand((sub) =>
					sub // GIVE
						.setName('give')
						.setDescription('Donne une certaine quantité de monnaie à un membre.')
						.addUserOption((opt) =>
							opt //
								.setName('membre')
								.setDescription('Le membre concerné par cette action')
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
								.setDescription('Le montant à donner.')
								.setMinValue(1)
								.setRequired(true)
						)
				)
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

	public async chatInputView(interaction: Subcommand.ChatInputCommandInteraction) {
		try {
			// Récupération du membre spécifié ou du membre ayant effectué la commande si aucun spécifié
			const requestedUser = interaction.options.getUser('membre');
			const discordIdToFetch = requestedUser?.id ?? interaction.user.id;

			// Demande à l'API les informations de la bourse du membre en question via son ID discord
			const response = await container.economyService.view(discordIdToFetch);
			if (!response.success) {
				await interaction.reply({
					embeds: [Embeds.errorEmbed({ member: interaction.member as GuildMember, message: response.error })],
					flags: MessageFlags.Ephemeral
				});
				return;
			}

			const userBalance = response.data;

			if (!userBalance) {
				throw new Error('Aucune donnée reçue pour ce membre.');
			}

			// Vérification que le membre est sur le serveur (pour pouvoir afficher l'utilisateur dans l'embed)
			const member = await container.discordService.fetchMemberOrReply(interaction.guild, discordIdToFetch, interaction);
			if (!member) return;

			// Création et envoie de l'embed final
			const embed = Embeds.bourseEmbed(member, userBalance.gems, userBalance.rubies, formatTransactions(userBalance.transactions ?? []));

			await interaction.reply({ embeds: [embed] });
		} catch (error: any) {
			console.error(error);
			await interaction.reply({
				embeds: [Embeds.errorEmbed({ message: error.message || 'Erreur interne.' })],
				flags: MessageFlags.Ephemeral
			});
		}
	}

	public async chatInputGive(interaction: Subcommand.ChatInputCommandInteraction) {
		try {
			const senderId = interaction.user.id;
			const receiverId = interaction.options.getUser('membre')!.id;
			const currency = interaction.options.getString('monnaie')! as Currency;
			const amount = interaction.options.getNumber('valeur')!;

			// Envoie à l'API toutes les informations pour qu'elle fasse le nécessaire
			const response = await container.economyService.give(senderId, receiverId, currency, amount);
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
				action: 'give',
				targetId: receiverId,
				currency: 'rubies',
				amount: amount,
				update: response.data
			});

			await interaction.reply({ embeds: [embed] });
		} catch (error) {
			console.error(error);
			await interaction.reply({
				embeds: [Embeds.errorEmbed({ message: 'Erreur dans [chatInputGive].' })],
				flags: MessageFlags.Ephemeral
			});
		}
	}

	public async chatInputAdd(interaction: Subcommand.ChatInputCommandInteraction) {
		try {
			const staffMember = interaction.member;
			const targetId = interaction.options.getUser('membre')!.id;
			const currency = interaction.options.getString('monnaie')! as Currency;
			const amount = interaction.options.getNumber('valeur')!;

			if (!container.discordService.hasStaffRole(staffMember as GuildMember)) {
				await interaction.reply({
					embeds: [
						Embeds.errorEmbed({ member: staffMember as GuildMember, message: "Tu n'as pas la permission d'utiliser cette commande." })
					],
					flags: MessageFlags.Ephemeral
				});
				return;
			}

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
				currency: 'rubies',
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
			const staffMember = interaction.member;
			const targetId = interaction.options.getUser('membre')!.id;
			const currency = interaction.options.getString('monnaie')! as Currency;
			const amount = interaction.options.getNumber('valeur')!;

			if (!container.discordService.hasStaffRole(staffMember as GuildMember)) {
				await interaction.reply({
					embeds: [
						Embeds.errorEmbed({ member: staffMember as GuildMember, message: "Tu n'as pas la permission d'utiliser cette commande." })
					],
					flags: MessageFlags.Ephemeral
				});
				return;
			}

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
				currency: 'rubies',
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
			const staffMember = interaction.member;
			const targetId = interaction.options.getUser('membre')!.id;
			const currency = interaction.options.getString('monnaie')! as Currency;
			const amount = interaction.options.getNumber('valeur')!;

			if (!container.discordService.hasStaffRole(staffMember as GuildMember)) {
				await interaction.reply({
					embeds: [
						Embeds.errorEmbed({ member: staffMember as GuildMember, message: "Tu n'as pas la permission d'utiliser cette commande." })
					],
					flags: MessageFlags.Ephemeral
				});
				return;
			}

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
				currency: 'rubies',
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
