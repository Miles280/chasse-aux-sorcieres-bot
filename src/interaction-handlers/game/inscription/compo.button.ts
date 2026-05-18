import { ApplyOptions } from '@sapphire/decorators';
import { container, InteractionHandler, InteractionHandlerTypes } from '@sapphire/framework';
import { ButtonInteraction, CheckboxGroupBuilder, GuildMember, LabelBuilder, MessageFlags, ModalBuilder } from 'discord.js';
import { Camp } from '../../../enums/Camp';
import { getAlignmentLabel } from '../../../enums/Alignment';
import * as Embeds from '../../../utils/embeds';
import { InscriptionMessageBuilder } from '../../../builders/game/InscriptionMessage.builder';

@ApplyOptions<InteractionHandler.Options>({
	interactionHandlerType: InteractionHandlerTypes.Button
})
export class CompositionButtonHandler extends InteractionHandler {
	public override parse(interaction: ButtonInteraction) {
		if (!interaction.customId.startsWith('compo:button:')) return this.none();

		const [, , action, gameId, camp] = interaction.customId.split(':');
		return this.some({ action, gameId: Number(gameId), camp: camp as Camp });
	}

	public override async run(interaction: ButtonInteraction, data: { action: string; gameId: number; camp: Camp }) {
		switch (data.action) {
			case 'quickadd':
				return this.handleQuickaddRole(interaction, data.gameId, data.camp);
			case 'add':
				return this.handleAddRole(interaction, data.gameId, data.camp);
			case 'delete':
				return this.handleDeleteRole(interaction, data.gameId);
			case 'reset':
				return this.handleResetCompo(interaction, data.gameId);
			default:
				return;
		}
	}

	private async handleQuickaddRole(interaction: ButtonInteraction, gameId: number, camp: Camp) {
		// 1. Déterminer quel rôle ajouter en fonction du camp
		let targetRoleName = '';
		if (camp === Camp.WITCH) targetRoleName = 'Sorcière';
		else if (camp === Camp.VILLAGERS) targetRoleName = 'Paysan';
		else {
			return interaction.reply({
				embeds: [Embeds.errorEmbed({ member: interaction.member as GuildMember, message: 'Aucun rôle de base défini pour ce camp.' })],
				flags: MessageFlags.Ephemeral
			});
		}

		// 2. Récupérer les rôles de ce camp pour trouver l'ID du rôle ciblé
		const rolesResponse = await container.rolesService.getRolesByCamp(camp);

		if (!rolesResponse.success) {
			return interaction.reply({
				embeds: [Embeds.errorEmbed({ member: interaction.member as GuildMember, message: rolesResponse.error })],
				flags: MessageFlags.Ephemeral
			});
		}

		// On cherche notre rôle par son nom
		const baseRole = rolesResponse.data.find((r) => r.name === targetRoleName);

		if (!baseRole) {
			return interaction.reply({
				embeds: [
					Embeds.errorEmbed({
						member: interaction.member as GuildMember,
						message: `Le rôle "${targetRoleName}" est introuvable en base de données.`
					})
				],
				flags: MessageFlags.Ephemeral
			});
		}

		// 3. Ajouter le rôle à la partie
		// On passe l'ID dans un tableau de strings, comme l'attend sûrement ton service
		const addResponse = await container.inscriptionService.addRolesToGame(gameId, [baseRole.id.toString()]);

		if (!addResponse.success) {
			return interaction.reply({
				embeds: [Embeds.errorEmbed({ member: interaction.member as GuildMember, message: addResponse.error })],
				flags: MessageFlags.Ephemeral
			});
		}

		// 4. Mettre à jour le message d'inscription
		// On récupère la game en cours pour pouvoir reconstruire l'embed
		const gameResponse = await container.inscriptionService.getWaitingGame();

		if (gameResponse.success && interaction.message) {
			const compoPayload = InscriptionMessageBuilder.buildCompo(gameResponse.data, addResponse.data);
			await interaction.message.edit({
				...compoPayload,
				flags: MessageFlags.IsComponentsV2
			});
		}

		// 5. Répondre à l'interaction
		return interaction.reply({
			embeds: [
				Embeds.successEmbed({
					member: interaction.member as GuildMember,
					message: `Ajouté avec succès :\n> ${targetRoleName}`
				})
			],
			flags: MessageFlags.Ephemeral
		});
	}

	private async handleAddRole(interaction: ButtonInteraction, gameId: number, camp: Camp) {
		// 1. Récupération simultanée des rôles du camp ET de la compo actuelle
		// On utilise Promise.all pour gagner du temps
		const [rolesResponse, compoResponse] = await Promise.all([
			container.rolesService.getRolesByCamp(camp),
			container.inscriptionService.getCompo(gameId)
		]);

		// Vérification des erreurs pour les deux appels
		if (!rolesResponse.success) {
			return interaction.reply({
				embeds: [
					Embeds.errorEmbed({
						member: interaction.member as GuildMember,
						message: rolesResponse.error
					})
				],
				flags: MessageFlags.Ephemeral
			});
		} else if (!compoResponse.success) {
			return interaction.reply({
				embeds: [
					Embeds.errorEmbed({
						member: interaction.member as GuildMember,
						message: compoResponse.error
					})
				],
				flags: MessageFlags.Ephemeral
			});
		}

		// 2. Filtrage : On ne garde que les rôles qui ne sont PAS dans la compo
		// On crée un Set des IDs déjà présents pour une recherche rapide
		const existingRoleIds = new Set(compoResponse.data.composition.map((r) => r.id));

		const filteredRoles = rolesResponse.data.filter((role) => !existingRoleIds.has(role.id));

		// 3. Cas particulier : si tous les rôles sont déjà présents
		if (filteredRoles.length === 0) {
			return interaction.reply({
				embeds: [
					Embeds.errorEmbed({
						member: interaction.member as GuildMember,
						message: `Tous les rôles de ce camp sont déjà dans la composition.`
					})
				],
				flags: MessageFlags.Ephemeral
			});
		}

		// 4. Formatage des données filtrées
		const roleOptions = filteredRoles.map((role, index) => ({
			label: role.name,
			value: `${role.id}:${role.name}-${index}`, // On garde l'index pour la sécurité
			description: role.alignments.map(getAlignmentLabel).join(', ').slice(0, 100)
		}));

		// 5. Préparation de la Modal (le reste du code est identique)
		const modal = new ModalBuilder().setCustomId(`compo:modal:add`).setTitle(`Ajouter des rôles`);

		const chunkSize = 10;
		const labels: LabelBuilder[] = [];

		for (let i = 0; i < roleOptions.length; i += chunkSize) {
			const chunk = roleOptions.slice(i, i + chunkSize);
			const pageNumber = Math.floor(i / chunkSize) + 1;

			const roleCheckboxes = new CheckboxGroupBuilder()
				.setCustomId(`selected_roles_group_${pageNumber}`)
				.setOptions(chunk)
				.setMinValues(0)
				.setMaxValues(chunk.length)
				.setRequired(false);

			const roleLabelContainer = new LabelBuilder()
				.setLabel(`Rôles disponibles - Partie ${pageNumber}`)
				.setCheckboxGroupComponent(roleCheckboxes);

			labels.push(roleLabelContainer);
		}

		modal.addLabelComponents(...labels.slice(0, 5));

		return interaction.showModal(modal);
	}

	private async handleDeleteRole(interaction: ButtonInteraction, gameId: number) {
		// 1. Récupération des rôles
		const response = await container.inscriptionService.getCompo(gameId);

		if (!response.success) {
			return interaction.reply({
				embeds: [Embeds.errorEmbed({ member: interaction.member as GuildMember, message: response.error })],
				flags: MessageFlags.Ephemeral
			});
		}

		const roles = response.data.composition;

		if (roles.length === 0) {
			return interaction.reply({
				embeds: [Embeds.errorEmbed({ member: interaction.member as GuildMember, message: 'Aucun rôle à supprimer.' })],
				flags: MessageFlags.Ephemeral
			});
		}

		// 2. Organisation par catégorie (selon ton Enum Camp)
		// On définit l'ordre d'affichage ici
		const categories = [
			{ label: 'Sorcières', roles: roles.filter((r) => r.camp === Camp.WITCH) },
			{ label: 'Villageois', roles: roles.filter((r) => r.camp === Camp.VILLAGERS) },
			{ label: 'Indépendants', roles: roles.filter((r) => r.camp === Camp.INDEPENDENT) }
		];

		const modal = new ModalBuilder().setCustomId(`compo:modal:remove`).setTitle('Sélectionner les rôles à supprimer');
		const labels: LabelBuilder[] = [];
		const chunkSize = 10;

		// Garder un index global pour la clé unique "role.id-index"
		let globalIndex = 0;

		// 3. Boucle sur les catégories pour créer les sections
		for (const category of categories) {
			if (category.roles.length === 0) continue;

			// Si on a déjà 5 labels (limite Discord), on s'arrête
			if (labels.length >= 5) break;

			// Découpage de la catégorie en paquets de 10
			for (let i = 0; i < category.roles.length; i += chunkSize) {
				if (labels.length >= 5) break;

				const chunk = category.roles.slice(i, i + chunkSize);
				const partSuffix = category.roles.length > chunkSize ? ` - Partie ${Math.floor(i / chunkSize) + 1}` : '';

				// Formatage des options pour ce chunk
				const options = chunk.map((role) => ({
					label: role.name,
					value: `${role.id}:${role.name}-${globalIndex++}`, // Unicité garantie
					description: role.alignments.map(getAlignmentLabel).join(', ').slice(0, 100)
				}));

				const roleCheckboxes = new CheckboxGroupBuilder()
					.setCustomId(`delete_group_${category.label}_${i}`)
					.setOptions(options)
					.setMinValues(0)
					.setMaxValues(options.length)
					.setRequired(false);

				const labelContainer = new LabelBuilder().setLabel(`${category.label}${partSuffix}`).setCheckboxGroupComponent(roleCheckboxes);

				labels.push(labelContainer);
			}
		}

		// 4. Assemblage final
		modal.addLabelComponents(...labels);

		return interaction.showModal(modal);
	}

	private async handleResetCompo(interaction: ButtonInteraction, gameId: number) {
		const response = await container.inscriptionService.resetRolesToGame(gameId);

		if (!response.success) {
			return interaction.reply({
				embeds: [Embeds.errorEmbed({ member: interaction.member as GuildMember, message: response.error })],
				flags: MessageFlags.Ephemeral
			});
		}

		const gameResponse = await container.inscriptionService.getWaitingGame();

		if (gameResponse.success && interaction.message) {
			const compoPayload = InscriptionMessageBuilder.buildCompo(gameResponse.data, response.data);
			await interaction.message.edit({
				...compoPayload,
				flags: MessageFlags.IsComponentsV2
			});
		}

		return interaction.reply({
			embeds: [
				Embeds.successEmbed({
					member: interaction.member as GuildMember,
					message: `La composition a été reset.`
				})
			],
			flags: MessageFlags.Ephemeral
		});
	}
}
