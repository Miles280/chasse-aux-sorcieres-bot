import { ApplyOptions } from '@sapphire/decorators';
import { container, InteractionHandler, InteractionHandlerTypes } from '@sapphire/framework';
import { StringSelectMenuInteraction, TextChannel } from 'discord.js';
import * as Embeds from '../../../utils/embeds';

@ApplyOptions<InteractionHandler.Options>({
	interactionHandlerType: InteractionHandlerTypes.SelectMenu
})
export class CulteSelectHandler extends InteractionHandler {
	public override parse(interaction: StringSelectMenuInteraction) {
		return interaction.customId === 'culte:select' ? this.some() : this.none();
	}

	public override async run(interaction: StringSelectMenuInteraction) {
		await interaction.deferUpdate();

		try {
			const selectedUserIds = interaction.values;

			if (!interaction.guild) {
				return interaction.editReply({
					embeds: [Embeds.errorEmbed({ title: 'Erreur', message: 'Interaction hors serveur.' })],
					components: []
				});
			}

			if (!selectedUserIds || selectedUserIds.length === 0) {
				return interaction.editReply({
					embeds: [Embeds.errorEmbed({ title: 'Aucun joueur', message: 'Aucun joueur sélectionné.' })],
					components: []
				});
			}

			const activeGameResponse = await container.inGameService.getActiveGame();
			if (!activeGameResponse.success || !activeGameResponse.data) {
				return interaction.editReply({
					embeds: [Embeds.errorEmbed({ title: 'Erreur', message: 'Aucune partie active trouvée sur ce serveur.' })],
					components: []
				});
			}

			const cultChannelId: string | undefined = activeGameResponse.data.discordChannels?.['fanatiqueChannelId'];
			if (!cultChannelId) {
				return interaction.editReply({
					embeds: [
						Embeds.errorEmbed({
							title: 'Salon introuvable',
							message: "Le salon du Culte (`fanatiqueChannelId`) n'est pas enregistré pour cette partie."
						})
					],
					components: []
				});
			}

			const fetchedChannel = await interaction.guild.channels.fetch(cultChannelId).catch(() => null);
			if (!fetchedChannel || !fetchedChannel.isTextBased()) {
				return interaction.editReply({
					embeds: [
						Embeds.errorEmbed({
							title: 'Salon invalide',
							message: "Impossible d'accéder au salon textuel du Culte."
						})
					],
					components: []
				});
			}

			const cultChannel = fetchedChannel as TextChannel;

			for (const userId of selectedUserIds) {
				await cultChannel.permissionOverwrites.edit(userId, {
					ViewChannel: true
				});
			}

			const mentions = selectedUserIds.map((id) => `<@${id}>`).join(', ');

			await cultChannel.send({
				content:
					`## Le Culte\n` +
					`${mentions} : vous avez été secrètement recrutés dans le **Culte**.\n\n` +
					`Vous conservez votre camp et votre but d'origine, mais vous faites désormais partie de ce cercle.\n` +
					`-# Vous ne pouvez pas échanger entre vous autrement que par vos votes, en écrivant uniquement **« Oui »** ou **« Non »**.`
			});

			return interaction.editReply({
				embeds: [
					Embeds.successEmbed({
						title: 'Joueurs ajoutés avec succès',
						message: `Les joueurs suivants ont été ajoutés au salon ${cultChannel.toString()} et notifiés : ${mentions}.`
					})
				],
				components: []
			});
		} catch (error) {
			container.logger.error(error);
			return interaction.editReply({
				embeds: [
					Embeds.errorEmbed({
						title: 'Erreur fatale',
						message: "Une erreur est survenue lors de l'ajout des joueurs au Culte."
					})
				],
				components: []
			});
		}
	}
}
