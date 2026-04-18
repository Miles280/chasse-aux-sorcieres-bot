import { ApplyOptions } from '@sapphire/decorators';
import { container } from '@sapphire/framework';
import { GuildTextBasedChannel, InteractionContextType, Message, MessageFlags, PermissionFlagsBits } from 'discord.js';
import { Subcommand } from '@sapphire/plugin-subcommands';
import { InscriptionMessageBuilder } from '../../builders/game/InscriptionMessage.builder';
import { GameData } from '../../models/Game.interface';
import * as Embeds from '../../utils/embeds';

@ApplyOptions<Subcommand.Options>({
	name: 'inscription',
	description: `Gestion de l'inscription à une partie de Chasse aux Sorcières.`,
	subcommands: [
		{ name: 'open', chatInputRun: 'chatInputOpen' },
		{ name: 'close', chatInputRun: 'chatInputClose' },
		{ name: 'kick', chatInputRun: 'chatInputKick' },
		{ name: 'cancel', chatInputRun: 'chatInputCancel' }
	]
})
export class InscriptionCommand extends Subcommand {
	public override registerApplicationCommands(registry: Subcommand.Registry) {
		registry.registerChatInputCommand((builder) =>
			builder
				.setName(this.name)
				.setDescription(this.description)
				.setContexts([InteractionContextType.Guild])
				.setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels)
				.addSubcommand((sub) =>
					sub
						.setName('open')
						.setDescription('Crée ou ouvre les inscriptions pour une partie de Chasse aux Sorcières.')
						.addNumberOption((opt) =>
							opt
								.setName('temps')
								.setDescription('Le temps avant la fermeture automatique des inscriptions (en minutes).')
								.setMinValue(5)
								.setMaxValue(30)
						)
						.addNumberOption((opt) =>
							opt //
								.setName('max')
								.setDescription('Le maximum de joueurs autorisés pour la partie.')
								.setMinValue(8)
						)
				)
				.addSubcommand((sub) =>
					sub //
						.setName('close')
						.setDescription('Ferme les inscriptions en cours.')
				)
				.addSubcommand((sub) =>
					sub
						.setName('kick')
						.setDescription('Expulse un joueur de la liste des inscrits.')
						.addUserOption((opt) =>
							opt //
								.setName('joueur')
								.setDescription('Le joueur à expulser.')
								.setRequired(true)
						)
				)
				.addSubcommand((sub) =>
					sub //
						.setName('cancel')
						.setDescription('Annule les inscriptions en cours.')
				)
		);
	}

	public async chatInputOpen(interaction: Subcommand.ChatInputCommandInteraction) {
		const maxPlayers = interaction.options.getNumber('max');
		const remainingTime = interaction.options.getNumber('temps');

		await interaction.deferReply({ flags: MessageFlags.Ephemeral });

		const configResponse = await container.serverConfigService.getConfig(interaction.guildId!);
		if (!configResponse.success) {
			await interaction.reply({
				embeds: [Embeds.errorEmbed({ title: 'Erreur de récupération des config', message: configResponse.error })]
			});
			return;
		}

		const { inscriptionChannelId, inscriptionVoiceChannelId: vocalId, gameMjChannelId } = configResponse.data;

		let targetChannel = interaction.channel as GuildTextBasedChannel;
		if (inscriptionChannelId) {
			const fetchedChannel = await interaction.guild?.channels.fetch(inscriptionChannelId).catch(() => null);
			if (fetchedChannel?.isTextBased() && fetchedChannel.isSendable()) {
				targetChannel = fetchedChannel;
			}
		}

		// Récupération du salon MJ
		let mjChannel: GuildTextBasedChannel | null = null;
		if (gameMjChannelId) {
			const fetchedMjChannel = await interaction.guild?.channels.fetch(gameMjChannelId).catch(() => null);
			if (fetchedMjChannel?.isTextBased() && fetchedMjChannel.isSendable()) {
				mjChannel = fetchedMjChannel;
			}
		}

		if (!targetChannel || !vocalId) {
			return interaction.editReply({
				embeds: [Embeds.errorEmbed({ title: 'Erreur de config', message: "Salon d'inscription ou Vocal manquant !" })]
			});
		}

		let response = await container.inscriptionService.getWaitingGame();
		let game: GameData;
		let message: Message;
		let compoMessage: Message | null = null;
		let statusMessage: string = '';

		// Initialisation / Récupération de la game
		if (response.success) {
			game = response.data;
		} else {
			const createResponse = await container.inscriptionService.create(interaction.user.id);
			if (!createResponse.success) {
				return interaction.editReply({
					embeds: [Embeds.errorEmbed({ title: 'Action refusée', message: createResponse.error })]
				});
			}
			game = createResponse.data;
			statusMessage = `Une nouvelle partie a été créée. `;
		}

		const payload = InscriptionMessageBuilder.buildOpened(game, vocalId, maxPlayers, remainingTime);

		// --- GESTION DU MESSAGE D'INSCRIPTION (Public) ---
		if (game.inscriptionMessageId) {
			try {
				const existingMessage = await targetChannel.messages.fetch(game.inscriptionMessageId);
				message = await existingMessage.edit(payload);
				statusMessage += `Message d'inscription mis à jour dans <#${targetChannel.id}>.`;
			} catch {
				message = await targetChannel.send(payload);
				statusMessage += `Nouveau message d'inscription envoyé dans <#${targetChannel.id}>.`;
			}
		} else {
			message = await targetChannel.send(payload);
			statusMessage += `Inscriptions ouvertes dans <#${targetChannel.id}> !`;
		}

		// --- GESTION DU MESSAGE DE COMPO (Salon MJ) ---
		if (mjChannel) {
			// Supposons que tu as une méthode buildCompo dans ton Builder
			const compoPayload = InscriptionMessageBuilder.buildCompo(game);

			if (game.compoMessageId) {
				try {
					const existingCompo = await mjChannel.messages.fetch(game.compoMessageId);
					compoMessage = await existingCompo.edit(compoPayload);
				} catch {
					compoMessage = await mjChannel.send(compoPayload);
				}
			} else {
				compoMessage = await mjChannel.send(compoPayload);
			}
			statusMessage += `\nMessage de compo synchronisé dans <#${mjChannel.id}>.`;
		} else {
			statusMessage += `\nAucun salon MJ configuré, le message de compo n'a pas pu être envoyé.`;
		}

		// 1. Mettre à jour les IDs dans l'API
		await container.inscriptionService.updateMessages(
			game.id,
			message.id,
			compoMessage?.id || '' // On envoie l'ID du nouveau message compo (ou vide s'il n'existe pas)
		);

		// 2. Programmation de la fermeture automatique
		if (remainingTime && remainingTime > 0) {
			setTimeout(
				async () => {
					await this.autoCloseInscription(game.id, message.id, targetChannel.id, vocalId).catch(console.error);
				},
				remainingTime * 60 * 1000
			);
			statusMessage += `\n-# Fermeture automatique configurée dans ${remainingTime} minutes.`;
		}

		// 3. Réponse finale à l'interaction
		return interaction.editReply({
			embeds: [
				Embeds.successEmbed({
					title: 'Action réalisée avec succès',
					message: statusMessage
				})
			]
		});
	}

	public async chatInputClose(interaction: Subcommand.ChatInputCommandInteraction) {
		await interaction.deferReply({ flags: MessageFlags.Ephemeral });

		const configResponse = await container.serverConfigService.getConfig(interaction.guildId!);
		if (!configResponse.success) {
			await interaction.reply({
				embeds: [Embeds.errorEmbed({ title: 'Erreur de récupération des config', message: configResponse.error })]
			});
			return;
		}

		const { inscriptionChannelId, inscriptionVoiceChannelId: vocalId } = configResponse.data;

		let targetChannel = interaction.channel as GuildTextBasedChannel;

		if (inscriptionChannelId) {
			const fetchedChannel = await interaction.guild?.channels.fetch(inscriptionChannelId).catch(() => null);
			if (fetchedChannel?.isTextBased() && fetchedChannel.isSendable()) {
				targetChannel = fetchedChannel;
			}
		}

		if (!targetChannel) {
			return interaction.editReply({
				embeds: [Embeds.errorEmbed({ title: 'Erreur de config', message: 'InscriptionChannelId manquant !' })]
			});
		}

		if (!vocalId) {
			return interaction.editReply({
				embeds: [Embeds.errorEmbed({ title: 'Erreur de config', message: 'inscriptionVoiceChannelId manquant !' })]
			});
		}

		let response = await container.inscriptionService.getWaitingGame();
		let game: GameData;
		let message: Message;

		if (response.success) {
			game = response.data;
			if (game.inscriptionMessageId) {
				try {
					const existingMessage = await targetChannel.messages.fetch(game.inscriptionMessageId);
					const updatedPayload = InscriptionMessageBuilder.buildClosed(game, vocalId);
					message = await existingMessage.edit(updatedPayload);
				} catch (err) {
					return interaction.editReply({
						embeds: [Embeds.errorEmbed({ title: 'Action refusée', message: "Le message d'inscription n'a pas été trouvé." })]
					});
				}
			} else {
				return interaction.editReply({
					embeds: [Embeds.errorEmbed({ title: 'Action refusée', message: "Le message d'inscription n'a pas été trouvé." })]
				});
			}
		} else {
			return interaction.editReply({
				embeds: [Embeds.errorEmbed({ title: 'Action refusée', message: "Le message d'inscription n'a pas été trouvé." })]
			});
		}

		await container.inscriptionService.updateMessages(game.id, message.id, game.compoMessageId || '');

		return interaction.editReply({
			embeds: [
				Embeds.successEmbed({
					title: 'Action réalisée avec succès',
					message: `Inscriptions fermées dans <#${targetChannel.id}> !`
				})
			]
		});
	}

	public async chatInputKick(interaction: Subcommand.ChatInputCommandInteraction) {
		await interaction.deferReply({ flags: MessageFlags.Ephemeral });

		try {
			const player = interaction.options.getUser('joueur', true);

			// 1. Récupérer la partie en attente
			const gameResponse = await container.inscriptionService.getWaitingGame();

			if (!gameResponse.success) {
				return interaction.editReply({ content: '❌ Aucune inscription en cours.' });
			}

			const game = gameResponse.data;

			// 2. Vérifier que le joueur est bien inscrit
			if (!game.players.includes(player.id)) {
				return interaction.editReply({ content: `❌ <@${player.id}> n'est pas inscrit à cette partie.` });
			}

			// 3. Retirer le joueur via l'API
			const kickResponse = await container.inscriptionService.inscription(game.id, player.id, 'leave');

			if (!kickResponse.success) {
				return interaction.editReply({ content: `❌ Impossible d'expulser le joueur: ${kickResponse.error}` });
			}

			// 4. Mettre à jour le message d'inscription
			if (game.inscriptionMessageId) {
				await this.updateInscriptionMessage(game.id, interaction.guildId!);
			}

			await interaction.editReply({ content: `✅ <@${player.id}> a été expulsé des inscriptions.` });
		} catch (error) {
			console.error('Erreur dans chatInputKick:', error);
			await interaction.editReply({
				content: `❌ Une erreur s'est produite: ${error instanceof Error ? error.message : 'Erreur inconnue'}`
			});
		}
		return;
	}

	public async chatInputCancel(interaction: Subcommand.ChatInputCommandInteraction) {
		await interaction.deferReply({ flags: MessageFlags.Ephemeral });

		try {
			// 1. Récupérer la partie en attente
			const response = await container.inscriptionService.getWaitingGame();

			if (!response.success) {
				return interaction.editReply({ content: '❌ Aucune inscription en cours.' });
			}

			const game = response.data;

			// 2. Supprimer le message d'inscription
			if (game.inscriptionMessageId) {
				const configResponse = await container.serverConfigService.getConfig(interaction.guildId!);
				let channelId = interaction.channelId;

				if (configResponse.success && configResponse.data.inscriptionChannelId) {
					channelId = configResponse.data.inscriptionChannelId;
				}

				const channel = await interaction.guild?.channels.fetch(channelId);
				if (channel?.isTextBased()) {
					try {
						const message = await channel.messages.fetch(game.inscriptionMessageId);
						await message.delete();
					} catch (error) {
						console.error('Impossible de supprimer le message:', error);
					}
				}
			}

			// 3. Appeler l'API pour supprimer la partie
			const cancelResponse = await container.inscriptionService.cancelGame(game.id);

			if (!cancelResponse.success) {
				return interaction.editReply({
					content: `⚠️ Le message a été supprimé mais erreur API: ${cancelResponse.error}`
				});
			}

			await interaction.editReply({ content: '✅ Les inscriptions ont été annulées et la partie supprimée.' });
		} catch (error) {
			console.error('Erreur dans chatInputCancel:', error);
			await interaction.editReply({
				content: `❌ Une erreur s'est produite: ${error instanceof Error ? error.message : 'Erreur inconnue'}`
			});
		}
		return;
	}

	/**
	 * Méthode utilitaire pour mettre à jour le message d'inscription
	 */
	private async updateInscriptionMessage(gameId: number, guildId: string): Promise<void> {
		const gameResponse = await container.inscriptionService.getGameById(gameId);
		if (!gameResponse.success) return;

		const game = gameResponse.data;
		if (!game.inscriptionMessageId) return;

		const configResponse = await container.serverConfigService.getConfig(guildId);
		const channelId = configResponse.success ? configResponse.data.inscriptionChannelId : null;
		if (!channelId) return;

		const channel = await container.client.channels.fetch(channelId);
		if (!channel?.isSendable()) return;

		// const message = await channel.messages.fetch(game.inscriptionMessageId);
		// const updatedPayload = InscriptionMessageBuilder.build(game, null);

		// await message.edit(updatedPayload);
	}

	/**
	 * Fermeture automatique des inscriptions
	 */
	private async autoCloseInscription(gameId: number, messageId: string, channelId: string, vocId: string): Promise<void> {
		const response = await container.inscriptionService.getGameById(gameId);
		if (!response.success) {
			return;
		}

		const channel = await container.client.channels.fetch(channelId).catch(() => null);
		if (!channel || !channel.isTextBased()) {
			return;
		}

		const message = await (channel as GuildTextBasedChannel).messages.fetch(messageId);
		const updatedPayload = InscriptionMessageBuilder.buildClosed(response.data, vocId);

		await message.edit(updatedPayload);
	}
}
