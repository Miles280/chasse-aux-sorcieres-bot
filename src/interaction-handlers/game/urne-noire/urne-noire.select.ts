import { ApplyOptions } from '@sapphire/decorators';
import { container, InteractionHandler, InteractionHandlerTypes } from '@sapphire/framework';
import { StringSelectMenuInteraction, TextChannel } from 'discord.js';
import * as Embeds from '../../../utils/embeds';

@ApplyOptions<InteractionHandler.Options>({
	interactionHandlerType: InteractionHandlerTypes.SelectMenu
})
export class UrneNoireSelectHandler extends InteractionHandler {
	public override parse(interaction: StringSelectMenuInteraction) {
		return interaction.customId === 'urne-noire:select' ? this.some() : this.none();
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

			const urnChannelId: string | undefined = activeGameResponse.data.discordChannels?.['conspirateurChannelId'];
			if (!urnChannelId) {
				return interaction.editReply({
					embeds: [
						Embeds.errorEmbed({
							title: 'Salon introuvable',
							message: "Le salon de l'Urne Noire (`conspirateurChannelId`) n'est pas enregistré pour cette partie."
						})
					],
					components: []
				});
			}

			const fetchedChannel = await interaction.guild.channels.fetch(urnChannelId).catch(() => null);
			if (!fetchedChannel || !fetchedChannel.isTextBased()) {
				return interaction.editReply({
					embeds: [
						Embeds.errorEmbed({
							title: 'Salon invalide',
							message: "Impossible d'accéder au salon textuel de l'Urne Noire."
						})
					],
					components: []
				});
			}

			const urnChannel = fetchedChannel as TextChannel;

			for (const userId of selectedUserIds) {
				await urnChannel.permissionOverwrites.edit(userId, {
					ViewChannel: true
				});
			}

			const mentions = selectedUserIds.map((id) => `<@${id}>`).join(', ');

			await urnChannel.send({
				content:
					`## Urne Noire\n` +
					`${mentions} : vous avez été ajoutés à l'Urne Noire.\n\n` +
					`Vous avez **2 minutes** pour débattre à l'écrit ici avant de procéder à votre **vote noir**. ` +
					`Ces votes s'ajouteront à ceux de la journée à venir et seront révélés à tout le village au début du débat.`
			});

			return interaction.editReply({
				embeds: [
					Embeds.successEmbed({
						title: 'Joueurs ajoutés avec succès',
						message: `Les joueurs suivants ont été ajoutés au salon ${urnChannel.toString()} et notifiés : ${mentions}.`
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
						message: "Une erreur est survenue lors de l'ajout des joueurs à l'Urne Noire."
					})
				],
				components: []
			});
		}
	}
}
