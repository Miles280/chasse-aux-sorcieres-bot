import { container, InteractionHandler, InteractionHandlerTypes } from '@sapphire/framework';
import { ApplyOptions } from '@sapphire/decorators';
import { GuildMember, MessageFlags, ModalSubmitInteraction } from 'discord.js';
import { InscriptionMessageBuilder } from '../../../builders/game/InscriptionMessage.builder';
import { GameData } from '../../../models/Game.interface';
import * as Embeds from '../../../utils/embeds';

@ApplyOptions<InteractionHandler.Options>({
	interactionHandlerType: InteractionHandlerTypes.ModalSubmit
})
export class CompositionModalHandler extends InteractionHandler {
	public override parse(interaction: ModalSubmitInteraction) {
		if (!interaction.customId.startsWith('compo:modal:')) return this.none();

		const [, , action] = interaction.customId.split(':');
		return this.some({ action });
	}

	public override async run(interaction: ModalSubmitInteraction, data: { action: string }) {
		const game = await container.inscriptionService.getWaitingGame();

		if (!game.success) {
			return interaction.reply({
				embeds: [
					Embeds.errorEmbed({
						member: interaction.member as GuildMember,
						message: game.error
					})
				],
				flags: MessageFlags.Ephemeral
			});
		}

		switch (data.action) {
			case 'add':
				return this.handleAddRole(interaction, game.data);
			case 'remove':
				return this.handleRemoveRole(interaction, game.data);
			default:
				return;
		}
	}

	private async handleAddRole(interaction: ModalSubmitInteraction, game: GameData) {
		// 1. Récupération des IDs (Ton code était bon ici !)
		const selectedRoleIds = interaction.fields.fields
			.filter((_, customId) => customId.startsWith('selected_roles_group_'))
			.reduce((acc, field) => {
				if ('values' in field && Array.isArray(field.values)) {
					// NETTOYAGE : On enlève le "-index"
					const cleanIds = field.values.map((val) => val.split('-')[0]);
					acc.push(...cleanIds);
				}
				return acc;
			}, [] as string[]);

		if (selectedRoleIds.length === 0) {
			return interaction.reply({
				embeds: [Embeds.errorEmbed({ member: interaction.member as GuildMember, message: "Tu n'as sélectionné aucun rôle." })],
				flags: MessageFlags.Ephemeral
			});
		}

		// 2. Mise à jour en base de données
		const response = await container.inscriptionService.addRolesToGame(game.id, selectedRoleIds);

		if (!response.success) {
			return interaction.reply({
				embeds: [Embeds.errorEmbed({ member: interaction.member as GuildMember, message: response.error })],
				flags: MessageFlags.Ephemeral
			});
		}

		// 3. MISE À JOUR DU MESSAGE D'INSCRIPTION
		const compoPayload = InscriptionMessageBuilder.buildCompo(game, response.data);

		if (interaction.message) {
			await interaction.message.edit({
				...compoPayload,
				flags: MessageFlags.IsComponentsV2
			});
		}

		// 4. RÉPONSE À LA MODAL (Succès)
		return interaction.reply({
			embeds: [
				Embeds.successEmbed({
					member: interaction.member as GuildMember,
					message: `**${selectedRoleIds.length}** rôle(s) ajouté(s) avec succès !`
				})
			],
			flags: MessageFlags.Ephemeral
		});
	}

	private async handleRemoveRole(interaction: ModalSubmitInteraction, game: GameData) {
		// 1. Récupération des IDs (Ton code était bon ici !)
		const selectedRoleIds = interaction.fields.fields
			.filter((_, customId) => customId.includes('_group_'))
			.reduce((acc, field) => {
				if ('values' in field && Array.isArray(field.values)) {
					const cleanIds = field.values.map((val) => val.split('-')[0]);
					acc.push(...cleanIds);
				}
				return acc;
			}, [] as string[]);

		if (selectedRoleIds.length === 0) {
			return interaction.reply({
				embeds: [Embeds.errorEmbed({ member: interaction.member as GuildMember, message: "Tu n'as sélectionné aucun rôle." })],
				flags: MessageFlags.Ephemeral
			});
		}

		// 2. Mise à jour en base de données
		const response = await container.inscriptionService.removeRolesToGame(game.id, selectedRoleIds);

		if (!response.success) {
			return interaction.reply({
				embeds: [Embeds.errorEmbed({ member: interaction.member as GuildMember, message: response.error })],
				flags: MessageFlags.Ephemeral
			});
		}

		// 3. MISE À JOUR DU MESSAGE D'INSCRIPTION
		const compoPayload = InscriptionMessageBuilder.buildCompo(game, response.data);

		if (interaction.message) {
			await interaction.message.edit({
				...compoPayload,
				flags: MessageFlags.IsComponentsV2
			});
		}

		// 4. RÉPONSE À LA MODAL (Succès)
		return interaction.reply({
			embeds: [
				Embeds.successEmbed({
					member: interaction.member as GuildMember,
					message: `**${selectedRoleIds.length}** rôle(s) suprimé(s) avec succès !`
				})
			],
			flags: MessageFlags.Ephemeral
		});
	}
}
