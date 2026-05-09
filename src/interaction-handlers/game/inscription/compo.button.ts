import { ApplyOptions } from '@sapphire/decorators';
import { container, InteractionHandler, InteractionHandlerTypes } from '@sapphire/framework';
import { ButtonInteraction, CheckboxGroupBuilder, GuildMember, LabelBuilder, MessageFlags, ModalBuilder } from 'discord.js';
import { Camp } from '../../../enums/Camp';
import { getAlignmentLabel } from '../../../enums/Alignment';
import * as Embeds from '../../../utils/embeds';

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
				return this.handleAddRole(interaction, data.camp);
			case 'delete':
				return this.handleDeleteRole(interaction, data.gameId);
			case 'reset':
				return this.handleResetCompo(interaction, data.gameId);
			default:
				return;
		}
	}

	private async handleQuickaddRole(interaction: ButtonInteraction, gameId: number, camp: Camp) {
		return interaction.reply({
			embeds: [Embeds.successEmbed({ title: 'test', message: `${gameId} et ${camp}` })]
		});
		// Logique d'ajout
	}

	private async handleAddRole(interaction: ButtonInteraction, camp: Camp) {
		// 1. Récupération des rôles depuis le service
		const response = await container.rolesService.getRolesByCamp(camp);

		if (!response.success) {
			return interaction.reply({
				embeds: [
					Embeds.errorEmbed({
						member: interaction.member as GuildMember,
						message: response.error
					})
				],
				flags: MessageFlags.Ephemeral
			});
		}

		// 2. Formatage des données
		const roleOptions = response.data.map((role, index) => ({
			label: role.name,
			value: `${role.id}-${index}`,
			description: role.alignments.map(getAlignmentLabel).join(', ').slice(0, 100)
		}));

		// 3. Préparation de la Modal
		const modal = new ModalBuilder().setCustomId(`compo:modal:add`).setTitle('Sélectionner les rôles à ajouter');

		// 4. Découpage par paquets (Chunking) et création des composants
		const chunkSize = 10;
		const labels: LabelBuilder[] = [];

		for (let i = 0; i < roleOptions.length; i += chunkSize) {
			const chunk = roleOptions.slice(i, i + chunkSize);
			const pageNumber = Math.floor(i / chunkSize) + 1;

			// Création du groupe de Checkboxes pour ce paquet
			const roleCheckboxes = new CheckboxGroupBuilder()
				.setCustomId(`selected_roles_group_${pageNumber}`)
				.setOptions(chunk) // Utilise maintenant le tableau formaté
				.setMinValues(0)
				.setMaxValues(chunk.length)
				.setRequired(false);

			// Création du container visuel (Label) pour organiser la modal
			const roleLabelContainer = new LabelBuilder().setLabel(`Partie ${pageNumber}`).setCheckboxGroupComponent(roleCheckboxes);

			labels.push(roleLabelContainer);
		}

		// 5. Assemblage et affichage
		// Note : Une modal Discord est limitée à 5 Action Rows (donc 5 labels ici max)
		modal.addLabelComponents(...labels);

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
				const partSuffix = category.roles.length > chunkSize ? ` (Partie ${Math.floor(i / chunkSize) + 1})` : '';

				// Formatage des options pour ce chunk
				const options = chunk.map((role) => ({
					label: role.name,
					value: `${role.id}-${globalIndex++}`, // Unicité garantie
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
		return interaction.reply({
			embeds: [Embeds.successEmbed({ title: 'test', message: `${gameId}` })]
		});
		// Logique de reset
	}
}
