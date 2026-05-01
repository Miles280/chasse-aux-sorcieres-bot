import { ApplyOptions } from '@sapphire/decorators';
import { InteractionHandler, InteractionHandlerTypes, container } from '@sapphire/framework';
import { ButtonInteraction, ContainerBuilder, MessageFlags, TextDisplayBuilder } from 'discord.js';
import { MoreOrLessMessageBuilder } from '../../../builders/casino/MoreOrLessMessage.builder';
import { colors } from '../../../utils/customColors';
import { emojis } from '../../../utils/emojis';
import { MoreOrLessGame } from '../../../models/MoreOrLessGame.interface';
import * as Embeds from '../../../utils/embeds';

@ApplyOptions<InteractionHandler.Options>({
	interactionHandlerType: InteractionHandlerTypes.Button
})
export class MoreOrLessButtonHandler extends InteractionHandler {
	public override parse(interaction: ButtonInteraction) {
		if (!interaction.customId.startsWith('mol:')) return this.none();
		return this.some();
	}

	public async run(interaction: ButtonInteraction) {
		const parts = interaction.customId.split(':');
		const action = parts[1];
		const userId = interaction.user.id;

		// 0. GESTION DES REPLAY / RECHALLENGE (boutons fin de partie)
		if (action === 'replay' || action === 'rechallenge') {
			const bet = parseInt(parts[2]);
			const lives = parseInt(parts[3]);
			const p1Id = parts[4];
			const p2Id = parts[5]; // undefined si mode solo

			// Sécurité : seul un joueur du duel peut relancer
			if (userId !== p1Id && userId !== p2Id) {
				return interaction.reply({
					embeds: [Embeds.errorEmbed({ message: "Ce bouton n'est pas pour toi." })],
					flags: MessageFlags.Ephemeral
				});
			}

			// Vérification économie du joueur qui relance
			const check = await container.economyService.view(userId);
			if (!check.success || check.data.rubies < bet) {
				return interaction.reply({
					embeds: [Embeds.errorEmbed({ message: "Tu n'as pas assez de rubis pour rejouer !" })],
					flags: MessageFlags.Ephemeral
				});
			}

			// 0.1 RECHALLENGE (DUEL MULTIJOUEUR)
			if (action === 'rechallenge') {
				const opponentId = userId === p1Id ? p2Id : p1Id;

				// Vérification économie adversaire
				const opponentCheck = await container.economyService.view(opponentId);
				if (!opponentCheck.success || opponentCheck.data.rubies < bet) {
					return interaction.reply({
						embeds: [Embeds.errorEmbed({ message: "Ton adversaire n'a plus assez de rubis pour rejouer !" })],
						flags: MessageFlags.Ephemeral
					});
				}

				// Retire les boutons de l'ancien message (évite double interaction)
				await interaction.message.edit({ components: [interaction.message.components[0].toJSON()] });

				// Transaction + création du deck
				const transaction = await container.casinoService.transaction(userId, bet, 'remove');
				if (!transaction.success) return interaction.reply({ content: 'Erreur transaction.', flags: MessageFlags.Ephemeral });

				const initData = await container.moreOrLessService.initDeckAndDraw();
				if (!initData) {
					await container.casinoService.transaction(userId, bet, 'add');
					return interaction.reply({ content: 'Erreur deck.', flags: MessageFlags.Ephemeral });
				}

				// Détermine aléatoirement qui commence
				const startingPlayer = Math.random() > 0.5 ? userId : opponentId;

				// Construction de la partie
				const challengeData: MoreOrLessGame = {
					messageId: '',
					channelId: interaction.channelId!,
					deckId: initData.deckId,
					bet,
					player1: { id: userId, lives },
					player2: { id: opponentId, lives },
					currentTurnId: startingPlayer,
					currentCard: initData.card,
					status: 'pending',
					totalLives: lives,
					totalCards: initData.totalCards,
					remainingCards: initData.remainingCards,
					challengeMessageId: ''
				};

				// Envoi du message de défi
				const response = await interaction.reply({
					...MoreOrLessMessageBuilder.buildChallengeMessage(challengeData),
					withResponse: true
				});

				const messageId = response.resource!.message!.id;
				challengeData.messageId = messageId;
				challengeData.challengeMessageId = messageId;

				await container.moreOrLessService.registerChallenge(challengeData);

				await interaction.editReply(MoreOrLessMessageBuilder.buildChallengeMessage(challengeData));

				// Expiration automatique du défi
				setTimeout(async () => {
					const challenge = container.moreOrLessService.getChallenge(messageId);
					if (!challenge || challenge.status !== 'pending') return;

					await container.moreOrLessService.cancelChallenge(messageId);

					const expired = new ContainerBuilder()
						.setAccentColor(colors.fail)
						.addTextDisplayComponents(
							new TextDisplayBuilder().setContent(`### ${emojis.redcheck} Proposition expirée\n<@${opponentId}> n'a pas répondu...`)
						);

					await interaction.editReply({
						flags: MessageFlags.IsComponentsV2,
						components: [expired.toJSON()]
					});
				}, 60000);

				return;
			}

			// 0.2 REPLAY (SOLO VS BOT)
			if (action === 'replay') {
				await interaction.message.edit({ components: [interaction.message.components[0].toJSON()] });

				const transaction = await container.casinoService.transaction(userId, bet, 'remove');
				if (!transaction.success) return interaction.reply({ content: 'Erreur transaction.', flags: MessageFlags.Ephemeral });

				const initData = await container.moreOrLessService.initDeckAndDraw();
				if (!initData) {
					await container.casinoService.transaction(userId, bet, 'add');
					return interaction.reply({ content: 'Erreur deck.', flags: MessageFlags.Ephemeral });
				}

				// Création partie solo
				const game: MoreOrLessGame = {
					messageId: '',
					channelId: interaction.channelId!,
					deckId: initData.deckId,
					bet,
					player1: { id: userId, lives },
					player2: { id: 'bot', lives },
					currentTurnId: Math.random() > 0.5 ? userId : 'bot',
					currentCard: initData.card,
					status: 'playing',
					expiresAt: Date.now() + 30000,
					totalLives: lives,
					totalCards: initData.totalCards,
					remainingCards: initData.remainingCards
				};

				const response = await interaction.reply({
					...MoreOrLessMessageBuilder.buildInitialDrawMessage(game),
					withResponse: true
				});

				game.messageId = response.resource!.message!.id;

				// Petite animation suspense
				await new Promise((r) => setTimeout(r, 4000));

				await container.moreOrLessService.registerGame(game);

				await interaction.editReply(MoreOrLessMessageBuilder.buildGameMessage(game));

				// Tour du bot si nécessaire
				if (game.currentTurnId === 'bot') {
					setTimeout(() => container.moreOrLessService.handleBotTurn(game.messageId), 4000);
				}
				return;
			}
		}

		// 1. GESTION DES DÉFIS (accept / decline)
		const messageId = interaction.message.id;

		if (action === 'accept' || action === 'decline') {
			if (action === 'accept') {
				const result = await container.moreOrLessService.acceptChallenge(messageId, userId);

				if (!result.success) {
					return interaction.reply({
						embeds: [Embeds.errorEmbed({ message: result.error! })],
						flags: MessageFlags.Ephemeral
					});
				}

				const game = result.game!;

				// 1.1 Animation tirage initial
				await interaction.update(MoreOrLessMessageBuilder.buildInitialDrawMessage(game));

				// 1.2 Suspense avant lancement
				await new Promise((r) => setTimeout(r, 4000));

				// 1.3 Lancement de la partie
				container.moreOrLessService.registerGame(game);

				await interaction.message.edit(MoreOrLessMessageBuilder.buildGameMessage(game));

				return;
			}

			// 1.2 REFUS DU DÉFI
			if (action === 'decline') {
				const result = await container.moreOrLessService.declineChallenge(messageId, userId);

				if (!result.success) {
					return interaction.reply({
						embeds: [Embeds.errorEmbed({ message: result.error! })],
						flags: MessageFlags.Ephemeral
					});
				}

				const refused = new ContainerBuilder()
					.setAccentColor(colors.fail)
					.addTextDisplayComponents(
						new TextDisplayBuilder().setContent(`### ${emojis.redcheck} Proposition refusée\n<@${userId}> a refusé le défi.`)
					);

				return interaction.update({
					components: [refused.toJSON()]
				});
			}
		}

		// 2. JEU EN COURS (actions "more" / "less")
		const game = container.moreOrLessService.getGame(messageId);

		if (!game) {
			return interaction.reply({
				content: 'Partie introuvable.',
				flags: MessageFlags.Ephemeral
			});
		}

		// 2.1 VÉRIFICATION DU TOUR
		if (game.currentTurnId !== userId) {
			return interaction.reply({
				embeds: [
					Embeds.errorEmbed({
						message: game.currentTurnId === 'bot' ? 'Le bot réfléchit...' : "Ce n'est pas ton tour !"
					})
				],
				flags: MessageFlags.Ephemeral
			});
		}

		const choice: 'more' | 'less' = action === 'more' ? 'more' : 'less';

		// 2.2 LANCEMENT DU TOUR
		const result = await container.moreOrLessService.playTurn(messageId, userId, choice);

		if (result.status === 'error') {
			return interaction.reply({
				content: result.message,
				flags: MessageFlags.Ephemeral
			});
		}

		// Stop des timers de tour
		container.moreOrLessService.clearTimers(game);

		const success = result.game!.lastTurnHistory!.success;

		// 3. PHASE DE RÉVÉLATION
		await interaction.update(MoreOrLessMessageBuilder.buildRevealMessage(userId, choice, result.drawnCard!, success));

		await new Promise((r) => setTimeout(r, 2500));

		// 4. RÉSOLUTION DU TOUR
		const updatedGame = result.game!;
		const isFinished = updatedGame.status === 'finished';

		if (!isFinished) {
			container.moreOrLessService.registerGame(updatedGame);
		}

		const finalMessage = isFinished
			? MoreOrLessMessageBuilder.buildEndMessage(updatedGame, result.winnerId!, result.loserId!)
			: MoreOrLessMessageBuilder.buildGameMessage(updatedGame);

		await interaction.message.edit(finalMessage);

		// 5. TOUR DU BOT
		if (!isFinished && updatedGame.currentTurnId === 'bot') {
			setTimeout(() => {
				container.moreOrLessService.handleBotTurn(messageId);
			}, 2000);
		}

		return;
	}
}
