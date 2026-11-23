import { ApplyOptions } from '@sapphire/decorators';
import { container, InteractionHandler, InteractionHandlerTypes } from '@sapphire/framework';
import { ButtonInteraction } from 'discord.js';
import { GameMessageBuilder } from '../../../builders/game/GameMessage.builder';
import { Camp } from '../../../enums/Camp';
import * as Embeds from '../../../utils/embeds';

@ApplyOptions<InteractionHandler.Options>({
	interactionHandlerType: InteractionHandlerTypes.Button
})
export class MainDuDestinButtonHandler extends InteractionHandler {
	public override parse(interaction: ButtonInteraction) {
		return interaction.customId.startsWith('main-du-destin:button') ? this.some() : this.none();
	}

	public override async run(interaction: ButtonInteraction) {
		await interaction.deferUpdate();

		// 1. Extraction des données du customId
		const [, , action, userDiscordId] = interaction.customId.split(':');

		try {
			const activeGameResponse = await container.inGameService.getActiveGame();
			if (!activeGameResponse.success || !activeGameResponse.data) {
				return interaction.editReply({
					embeds: [Embeds.errorEmbed({ title: 'Erreur', message: 'Aucune partie active trouvée sur ce serveur.' })],
					components: []
				});
			}
			const game = activeGameResponse.data;

			if (action === 'confirm') {
				const witchesChannelId: string | undefined = game.discordChannels?.['witchesChannelId'];
				if (!witchesChannelId || !interaction.guild) {
					return interaction.editReply({
						embeds: [
							Embeds.errorEmbed({
								title: 'Salon introuvable',
								message: "Le salon des Sorcières (`witchesChannelId`) n'est pas configuré pour cette partie."
							})
						],
						components: []
					});
				}

				const witchesChannel = await interaction.guild.channels.fetch(witchesChannelId).catch(() => null);
				if (!witchesChannel || !witchesChannel.isTextBased()) {
					return interaction.editReply({
						embeds: [
							Embeds.errorEmbed({
								title: 'Salon invalide',
								message: 'Impossible d’accéder au salon textuel des Sorcières.'
							})
						],
						components: []
					});
				}

				await witchesChannel.send({
					...GameMessageBuilder.buildMainDuDestin(userDiscordId, false)
				});

				return interaction.editReply({
					embeds: [
						Embeds.successEmbed({
							title: 'Résultat envoyé',
							message: `Le joueur <@${userDiscordId}> a bien été annoncé dans le salon des Sorcières.`
						})
					],
					components: []
				});
			}

			if (action === 'reroll') {
				const configResponse = await container.serverConfigService.getConfig(interaction.guildId!);
				if (!configResponse.success) {
					return interaction.editReply({
						embeds: [Embeds.errorEmbed({ title: 'Erreur Config', message: configResponse.error ?? 'Configuration introuvable.' })],
						components: []
					});
				}

				const players: any[] = game.gamePlayers ?? [];
				const invulnerabilityDiscordRoleId = configResponse.data?.invulnerabilityRoleId;

				if (invulnerabilityDiscordRoleId && interaction.guild) {
					await interaction.guild.members.fetch().catch(() => null);
				}

				const eligiblePlayers = players.filter((player: any) => {
					const discordId: string | undefined = player.user?.discordId ?? player.discordId;
					const member = discordId && interaction.guild ? interaction.guild.members.cache.get(discordId) : null;

					if (invulnerabilityDiscordRoleId && member?.roles.cache.has(invulnerabilityDiscordRoleId)) {
						return false;
					}

					if (player.realRole?.camp === Camp.WITCH) {
						return false;
					}

					return Boolean(discordId);
				});

				if (eligiblePlayers.length === 0) {
					return interaction.editReply({
						embeds: [
							Embeds.errorEmbed({
								title: 'Aucun joueur éligible',
								message: "Aucun joueur restant après exclusion des Sorcières et des joueurs ayant l'invulnérabilité."
							})
						],
						components: []
					});
				}

				const randomIndex = Math.floor(Math.random() * eligiblePlayers.length);
				const chosenPlayer = eligiblePlayers[randomIndex];

				return interaction.editReply({
					...GameMessageBuilder.buildMainDuDestin(chosenPlayer.user.discordId)
				});
			}

			return interaction.editReply({
				embeds: [Embeds.errorEmbed({ title: 'Action inconnue', message: `Action de bouton non reconnue : ${action ?? 'aucune'}.` })],
				components: []
			});
		} catch (error) {
			container.logger.error(error);
			return interaction.editReply({
				embeds: [Embeds.errorEmbed({ title: 'Erreur fatale', message: 'Une erreur est survenue lors du traitement du bouton.' })],
				components: []
			});
		}
	}
}
