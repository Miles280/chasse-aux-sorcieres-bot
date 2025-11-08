import { ApplyOptions } from '@sapphire/decorators';
import { container } from '@sapphire/framework';
import { bourseEmbed } from '../embeds/economyEmbeds';
import { InteractionContextType, MessageFlags } from 'discord.js';
import { formatTransactions } from '../utils/formatTransactions';
import { Subcommand } from '@sapphire/plugin-subcommands';

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
			const user = await container.economyService.getBalance(discordIdToFetch);

			// Vérification que l'API m'ait bien renvoyé une réponse
			if (!user) {
				await interaction.reply({ content: 'Impossible de trouver ce membre dans la base de données.', flags: MessageFlags.Ephemeral });
				return;
			}

			// Vérification que le membre est sur le serveur (pour pouvoir afficher l'utilisateur dans l'embed sinon ça crée des erreurs)
			const member = interaction.guild?.members.cache.get(user.discordId) || (await interaction.guild?.members.fetch(user.discordId));
			if (!member) {
				await interaction.reply({ content: 'Impossible de trouver ce membre sur le serveur.', flags: MessageFlags.Ephemeral });
				return;
			}

			// Création et envoie de l'embed final
			const embed = bourseEmbed({
				member,
				gems: user.gems,
				rubies: user.rubies,
				transactionsText: formatTransactions(user.transactions)
			});
			await interaction.reply({ embeds: [embed] });
		} catch (error) {
			console.error(error);
			await interaction.reply({ content: 'Erreur dans la classe [chatInputView].', flags: MessageFlags.Ephemeral });
		}
	}

	public async chatInputGive(interaction: Subcommand.ChatInputCommandInteraction) {
		try {
		} catch (error) {
			console.error(error);
			await interaction.reply({ content: 'Erreur dans la classe [chatInputGive].', flags: MessageFlags.Ephemeral });
		}
	}

	public async chatInputAdd(interaction: Subcommand.ChatInputCommandInteraction) {
		try {
		} catch (error) {
			console.error(error);
			await interaction.reply({ content: 'Erreur dans la classe [chatInputAdd].', flags: MessageFlags.Ephemeral });
		}
	}

	public async chatInputRemove(interaction: Subcommand.ChatInputCommandInteraction) {
		try {
		} catch (error) {
			console.error(error);
			await interaction.reply({ content: 'Erreur dans la classe [chatInputRemove].', flags: MessageFlags.Ephemeral });
		}
	}

	public async chatInputSet(interaction: Subcommand.ChatInputCommandInteraction) {
		try {
		} catch (error) {
			console.error(error);
			await interaction.reply({ content: 'Erreur dans la classe [chatInputSet].', flags: MessageFlags.Ephemeral });
		}
	}
}
