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
		// 1. Extraction des données complexes
		const selectedData = interaction.fields.fields
			.filter((_, customId) => customId.includes('_group_'))
			.reduce(
				(acc, field) => {
					if ('values' in field && Array.isArray(field.values)) {
						field.values.forEach((val) => {
							const [idPart] = val.split('-');
							const [id, name] = idPart.split(':');

							acc.push({ id, name });
						});
					}
					return acc;
				},
				[] as { id: string; name: string }[]
			);

		if (selectedData.length === 0) {
			return interaction.reply({
				embeds: [Embeds.errorEmbed({ member: interaction.member as GuildMember, message: "Tu n'as sélectionné aucun rôle." })],
				flags: MessageFlags.Ephemeral
			});
		}

		// On sépare les IDs pour l'API et les noms pour l'affichage
		const selectedIds = selectedData.map((d) => d.id);
		const roleNames = selectedData.map((d) => `> ${d.name}`).join('\n');

		// 2. Mise à jour en base de données
		const response = await container.inscriptionService.addRolesToGame(game.id, selectedIds);

		if (!response.success) {
			return interaction.reply({
				embeds: [Embeds.errorEmbed({ member: interaction.member as GuildMember, message: response.error })],
				flags: MessageFlags.Ephemeral
			});
		}

		// 3. Mise à jour du message d'inscription
		const compoPayload = InscriptionMessageBuilder.buildCompo(game, response.data);
		if (interaction.message) {
			await interaction.message.edit({ ...compoPayload, flags: MessageFlags.IsComponentsV2 });
		}

		// 4. RÉPONSE À LA MODAL
		return interaction.reply({
			embeds: [
				Embeds.successEmbed({
					member: interaction.member as GuildMember,
					message: `Ajouté avec succès :\n${roleNames}`
				})
			],
			flags: MessageFlags.Ephemeral
		});
	}

	private async handleRemoveRole(interaction: ModalSubmitInteraction, game: GameData) {
		// 1. Extraction des données complexes
		const selectedData = interaction.fields.fields
			.filter((_, customId) => customId.includes('_group_'))
			.reduce(
				(acc, field) => {
					if ('values' in field && Array.isArray(field.values)) {
						field.values.forEach((val) => {
							// val ressemble à "12:Sorcière-0"
							const [idPart] = val.split('-'); // ["12:Sorcière", "0"]
							const [id, name] = idPart.split(':'); // ["12", "Sorcière"]

							acc.push({ id, name });
						});
					}
					return acc;
				},
				[] as { id: string; name: string }[]
			);

		if (selectedData.length === 0) {
			return interaction.reply({
				embeds: [Embeds.errorEmbed({ member: interaction.member as GuildMember, message: "Tu n'as sélectionné aucun rôle." })],
				flags: MessageFlags.Ephemeral
			});
		}

		// On sépare les IDs pour l'API et les noms pour l'affichage
		const selectedIds = selectedData.map((d) => d.id);
		const roleNames = selectedData.map((d) => `> ${d.name}`).join('\n');

		// 2. Mise à jour en base de données
		const response = await container.inscriptionService.removeRolesToGame(game.id, selectedIds);

		if (!response.success) {
			return interaction.reply({
				embeds: [Embeds.errorEmbed({ member: interaction.member as GuildMember, message: response.error })],
				flags: MessageFlags.Ephemeral
			});
		}

		// 3. Mise à jour du message d'inscription
		const compoPayload = InscriptionMessageBuilder.buildCompo(game, response.data);
		if (interaction.message) {
			await interaction.message.edit({ ...compoPayload, flags: MessageFlags.IsComponentsV2 });
		}

		// 4. RÉPONSE À LA MODAL
		return interaction.reply({
			embeds: [
				Embeds.successEmbed({
					member: interaction.member as GuildMember,
					message: `Supprimé avec succès :\n${roleNames}`
				})
			],
			flags: MessageFlags.Ephemeral
		});
	}
}
