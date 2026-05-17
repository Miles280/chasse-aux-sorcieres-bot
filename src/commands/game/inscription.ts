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

		const closeTimestamp = remainingTime ? Math.floor(Date.now() / 1000) + remainingTime * 60 : null;

		const payload = InscriptionMessageBuilder.buildOpened(game, vocalId, maxPlayers, closeTimestamp);

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
			const compoData = await container.inscriptionService.getCompo(game.id);
			if (!compoData.success) return;

			const compoPayload = InscriptionMessageBuilder.buildCompo(game, compoData.data);

			if (game.compoMessageId) {
				try {
					const existingCompo = await mjChannel.messages.fetch(game.compoMessageId);
					compoMessage = await existingCompo.edit({
						...compoPayload,
						flags: MessageFlags.IsComponentsV2
					});
				} catch {
					compoMessage = await mjChannel.send({
						...compoPayload,
						flags: MessageFlags.IsComponentsV2
					});
				}
			} else {
				compoMessage = await mjChannel.send({
					...compoPayload,
					flags: MessageFlags.IsComponentsV2
				});
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
					await container.inscriptionService.autoCloseInscription(game.id, message.id, targetChannel.id, vocalId).catch(console.error);
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
				embeds: [Embeds.errorEmbed({ title: 'Action refusée', message: "Aucune partie est en cours d'inscription." })]
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

		const player = interaction.options.getUser('joueur', true);
		const guildId = interaction.guildId!; // Correction : il manquait la définition du guildId

		// 1. Récupérer la partie en attente
		const gameResponse = await container.inscriptionService.getWaitingGame();

		if (!gameResponse.success) {
			return interaction.editReply({
				embeds: [Embeds.errorEmbed({ title: 'Action refusée', message: "Aucune partie est en cours d'inscription." })]
			});
		}

		const game = gameResponse.data;

		// 2. Vérifier que le joueur est bien inscrit (joueur ou spectateur)
		const isPlayer = game.players?.includes(player.id);
		const isSpectator = game.spectators?.includes(player.id);

		if (!isPlayer && !isSpectator) {
			return interaction.editReply({
				embeds: [Embeds.errorEmbed({ title: 'Action refusée', message: `<@${player.id}> n'est pas inscrit à cette partie.` })]
			});
		}

		// 3. Retirer le joueur via l'API
		const kickResponse = await container.inscriptionService.inscription(game.id, player.id, 'leave');

		if (!kickResponse.success) {
			return interaction.editReply({
				embeds: [Embeds.errorEmbed({ title: 'Erreur', message: `Impossible d'expulser <@${player.id}> :\n${kickResponse.error}` })]
			});
		}

		// On utilise directement la partie mise à jour renvoyée par l'API
		const updatedGame = kickResponse.data;

		// 4. Récupération de la config (pour les rôles et les salons)
		const configResponse = await container.serverConfigService.getConfig(guildId);
		if (!configResponse.success) {
			return interaction.editReply({
				embeds: [Embeds.errorEmbed({ title: 'Erreur', message: 'Impossible de charger la configuration du serveur.' })]
			});
		}
		const config = configResponse.data;

		// 5. Retirer les rôles du joueur expulsé
		try {
			const member = await interaction.guild?.members.fetch(player.id).catch(() => null);
			if (member) {
				if (config.playerRoleId) await member.roles.remove(config.playerRoleId);
				if (config.deadPlayerRoleId) await member.roles.remove(config.deadPlayerRoleId); // Retrait du rôle spectateur
			}
		} catch (error) {
			console.error(`Impossible de retirer les rôles de ${player.tag} lors du kick:`, error);
		}

		// 6. Mettre à jour le message public d'inscription
		if (updatedGame.inscriptionMessageId && config.inscriptionChannelId) {
			try {
				const channel = await interaction.guild?.channels.fetch(config.inscriptionChannelId);
				if (channel?.isTextBased()) {
					const message = await channel.messages.fetch(updatedGame.inscriptionMessageId);

					// Extraction des données (le fameux timestamp et la limite)
					const meta = InscriptionMessageBuilder.extractGameMetaFromMessage(message);

					// On reconstruit le message (on présume que c'est l'état 'opened' si on est en train de kick)
					const updatedPayload = InscriptionMessageBuilder.buildOpened(
						updatedGame,
						config.inscriptionVoiceChannelId!,
						meta.maxPlayers,
						meta.closeTimestamp
					);

					await message.edit(updatedPayload);
				}
			} catch (error) {
				console.error("Erreur lors de la mise à jour du message public d'inscription (Kick):", error);
			}
		}

		// 7. Mettre à jour le message de composition (Panel MJ)
		if (updatedGame.compoMessageId && config.gameMjChannelId) {
			try {
				const mjChannel = await interaction.guild?.channels.fetch(config.gameMjChannelId);
				if (mjChannel?.isTextBased()) {
					const compoMsg = await mjChannel.messages.fetch(updatedGame.compoMessageId);

					const compoData = await container.inscriptionService.getCompo(game.id);
					if (!compoData.success) return;

					const compoPayload = InscriptionMessageBuilder.buildCompo(updatedGame, compoData.data);
					await compoMsg.edit(compoPayload);
				}
			} catch (error) {
				console.error('Erreur lors de la mise à jour du message de compo MJ (Kick):', error);
			}
		}

		// 8. Confirmer la réussite
		return interaction.editReply({
			embeds: [
				Embeds.successEmbed({
					title: 'Expulsion réussie',
					message: `<@${player.id}> a été expulsé des inscriptions et ses rôles ont été retirés.`
				})
			]
		});
	}

	public async chatInputCancel(interaction: Subcommand.ChatInputCommandInteraction) {
		await interaction.deferReply({ flags: MessageFlags.Ephemeral });

		try {
			const guildId = interaction.guildId!;

			const guild = interaction.guild;
			if (!guild) {
				return interaction.editReply({
					embeds: [Embeds.errorEmbed({ message: 'Cette commande ne peut être utilisée que sur un serveur.' })]
				});
			}

			// 1. Récupérer la partie en attente
			const response = await container.inscriptionService.getWaitingGame();

			if (!response.success) {
				return interaction.editReply({
					embeds: [Embeds.errorEmbed({ title: 'Erreur', message: 'Aucune inscription en cours.' })]
				});
			}

			const game = response.data;

			// 2. Récupérer la config du serveur (pour les rôles et salons)
			const configResponse = await container.serverConfigService.getConfig(guildId);
			if (!configResponse.success) {
				return interaction.editReply({
					embeds: [Embeds.errorEmbed({ title: 'Erreur', message: 'Impossible de charger la configuration du serveur.' })]
				});
			}
			const config = configResponse.data;

			// 3. Enlever les rôles aux joueurs et spectateurs (en parallèle)
			const removeRolesPromises: Promise<any>[] = [];

			// Retrait du rôle Joueur
			if (config.playerRoleId && game.players && game.players.length > 0) {
				for (const playerId of game.players) {
					removeRolesPromises.push(
						interaction.guild?.members
							.fetch(playerId)
							.then((member) => member.roles.remove(config.playerRoleId!))
							.catch(() => null) // Ignore les erreurs (ex: membre a quitté le serveur)
					);
				}
			}

			// Retrait du rôle Spectateur
			if (config.spectatorRoleId && game.spectators && game.spectators.length > 0) {
				for (const spectatorId of game.spectators) {
					removeRolesPromises.push(
						interaction.guild?.members
							.fetch(spectatorId)
							.then((member) => member.roles.remove(config.spectatorRoleId!))
							.catch(() => null)
					);
				}
			}

			// Exécution de tous les retraits de rôles en même temps
			await Promise.allSettled(removeRolesPromises);

			// 4. Supprimer les messages (Inscription & Compo MJ)
			const deleteMessage = async (channelId?: string, messageId?: string) => {
				if (!channelId || !messageId) return;
				try {
					const channel = await interaction.guild?.channels.fetch(channelId);
					if (channel?.isTextBased()) {
						const message = await channel.messages.fetch(messageId).catch(() => null);
						if (message) await message.delete();
					}
				} catch (error) {
					console.error(`Impossible de supprimer le message ${messageId} dans le salon ${channelId}:`, error);
				}
			};

			await Promise.allSettled([
				deleteMessage(config.inscriptionChannelId || interaction.channelId, game.inscriptionMessageId), // Message public
				deleteMessage(config.gameMjChannelId, game.compoMessageId) // Panel MJ
			]);

			// 5. Appeler l'API pour supprimer la partie
			const cancelResponse = await container.inscriptionService.cancelGame(game.id);

			if (!cancelResponse.success) {
				return interaction.editReply({
					embeds: [
						Embeds.errorEmbed({
							title: 'Annulation partielle',
							message: `Les messages et rôles ont été nettoyés, mais une erreur API est survenue : ${cancelResponse.error}`
						})
					]
				});
			}

			// 6. Succès
			return interaction.editReply({
				embeds: [
					Embeds.successEmbed({
						title: 'Annulation réussie',
						message: 'Les inscriptions ont été annulées, les rôles retirés, les messages supprimés et la partie effacée.'
					})
				]
			});
		} catch (error) {
			console.error('Erreur dans chatInputCancel:', error);
			return interaction.editReply({
				embeds: [
					Embeds.errorEmbed({
						title: 'Erreur critique',
						message: `Une erreur inattendue s'est produite: ${error instanceof Error ? error.message : 'Erreur inconnue'}`
					})
				]
			});
		}
	}
}
