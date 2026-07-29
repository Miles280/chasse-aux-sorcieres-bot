import { ApplyOptions } from '@sapphire/decorators';
import { Command, container } from '@sapphire/framework';
import { ChatInputCommandInteraction, InteractionContextType, MessageFlags, PermissionFlagsBits } from 'discord.js';
import { GameMessageBuilder } from '../../builders/game/GameMessage.builder';
import * as Embeds from '../../utils/embeds';

@ApplyOptions<Command.Options>({
	name: 'finish',
	description: 'Clôture la partie en cours et génère le récapitulatif pour le MJ.'
})
export class FinishGameCommand extends Command {
	public override registerApplicationCommands(registry: Command.Registry) {
		registry.registerChatInputCommand((builder) =>
			builder
				.setName(this.name)
				.setDescription(this.description)
				.setContexts([InteractionContextType.Guild])
				.setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels)
				.addStringOption((option) =>
					option
						.setName('camp')
						.setDescription('Le camp qui a remporté la partie.')
						.setRequired(true)
						.addChoices(
							{ name: 'Villageois', value: 'villagers' },
							{ name: 'Sorcières', value: 'witch' },
							{ name: 'Indépendant', value: 'independent' }
						)
				)
		);
	}

	public override async chatInputRun(interaction: ChatInputCommandInteraction) {
		await interaction.deferReply({ flags: [MessageFlags.Ephemeral] });

		const winningCamp = interaction.options.getString('camp', true);

		// 1. Récupération de la partie active
		const activeGameRes = await container.inGameService.getActiveGame();
		if (!activeGameRes.success || !activeGameRes.data) {
			return interaction.editReply({
				embeds: [Embeds.errorEmbed({ title: 'Erreur', message: 'Aucune partie active trouvée.' })]
			});
		}

		const game = activeGameRes.data;

		// 2. Appel à l'API pour finir la partie
		const finishRes = await container.inGameService.finishGame(game.id, winningCamp);

		if (!finishRes.success) {
			return interaction.editReply({
				embeds: [Embeds.errorEmbed({ title: 'Erreur de clôture', message: finishRes.error || "L'API a rencontré une erreur." })]
			});
		}

		const gameData = finishRes.data;

		// 3. Récupération des configs du serveur
		const configResponse = await container.serverConfigService.getConfig(interaction.guildId!);
		if (!configResponse.success) {
			return interaction.editReply({
				embeds: [Embeds.errorEmbed({ title: 'Erreur Config', message: configResponse.error })]
			});
		}

		const config = configResponse.data;

		// 4. Déplacement de tous les joueurs et spectateurs dans le vocal de départ
		if (config.inscriptionVoiceChannelId) {
			// Déplacement du MJ (celui qui clique)
			await container.discordService.moveMemberToVc(interaction.guild!, interaction.user.id, config.inscriptionVoiceChannelId);

			// Déplacement des joueurs
			for (const playerToMove of game.gamePlayers) {
				const discordId = playerToMove.user?.discordId;
				if (discordId) {
					await container.discordService.moveMemberToVc(interaction.guild!, discordId, config.inscriptionVoiceChannelId);
				}
			}
		}

		// 4. Appel du MessageBuilder pour construire l'UI
		const campDisplayNames: Record<string, string> = {
			villagers: 'Villageois',
			witch: 'Sorcières',
			independent: 'Indépendant'
		};

		const displayCampName = campDisplayNames[winningCamp] ?? winningCamp;

		const players = gameData.gamePlayers ?? [];
		const finishMessagePayload = GameMessageBuilder.buildFinishMessage(game.id, displayCampName, players);

		// 5. Envoi dans le salon MJ configuré
		if (config.gameMjChannelId) {
			const mjChannel = await interaction.guild?.channels.fetch(config.gameMjChannelId).catch(() => null);

			if (mjChannel && mjChannel.isTextBased()) {
				await mjChannel.send(finishMessagePayload).catch((err) => {
					container.logger.error(`Impossible d'envoyer le message dans le salon MJ : ${err.message}`);
				});
			}
		}

		// 6. Confirmation éphémère au membre exécutant la commande
		return interaction.editReply({
			embeds: [
				Embeds.successEmbed({
					title: 'Partie terminée !',
					message: `La partie a été clôturée. Le récapitulatif a été envoyé dans le salon MJ.`
				})
			]
		});
	}
}
