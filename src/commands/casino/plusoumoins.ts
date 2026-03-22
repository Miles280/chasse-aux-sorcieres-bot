import { ApplyOptions } from '@sapphire/decorators';
import { Command, container } from '@sapphire/framework';
import { ContainerBuilder, InteractionContextType, MessageFlags, TextDisplayBuilder } from 'discord.js';
import * as Embeds from '../../utils/embeds';
import { MoreOrLessMessageBuilder } from '../../builders/MoreOrLessMessage.builder';
import { MoreOrLessGame } from '../../models/MoreOrLessGame.interface';
import { colors } from '../../utils/customColors';
import { emojis } from '../../utils/emojis';

@ApplyOptions<Command.Options>({
	name: 'plusoumoins',
	description: 'Joue au Plus ou Moins (seul ou en duel) !'
})
export class MoreOrLessCommand extends Command {
	public override registerApplicationCommands(registry: Command.Registry) {
		registry.registerChatInputCommand((builder) =>
			builder
				.setName(this.name)
				.setDescription(this.description)
				.setContexts([InteractionContextType.Guild])
				.addIntegerOption((opt) =>
					opt //
						.setName('mise')
						.setDescription('Montant à miser')
						.setRequired(true)
						.setMinValue(10)
				)
				.addUserOption((opt) =>
					opt //
						.setName('adversaire')
						.setDescription('Joueur à défier')
				)
				.addIntegerOption((opt) =>
					opt //
						.setName('vies')
						.setDescription('Nombres de vies pour la partie')
						.setMinValue(2)
						.setMaxValue(5)
				)
		);
	}

	public override async chatInputRun(interaction: Command.ChatInputCommandInteraction) {
		const response = await interaction.deferReply({ withResponse: true });
		const messageId = response.resource!.message!.id;

		const bet = interaction.options.getInteger('mise', true);
		const opponent = interaction.options.getUser('adversaire');
		let lives = interaction.options.getInteger('vies') ?? 3;
		const userId = interaction.user.id;

		if (!lives) {
			lives = 3;
		}

		// 1. Vérification économique du joueur
		const check = await container.economyService.view(userId);
		if (!check.success || check.data.rubies < bet) {
			return interaction.reply({
				embeds: [Embeds.errorEmbed({ message: 'Pas assez de rubis !' })],
				flags: MessageFlags.Ephemeral
			});
		}

		// --- CAS DUEL CONTRE UN JOUEUR ---
		if (opponent) {
			if (opponent.bot) {
				return interaction.reply({
					embeds: [
						Embeds.errorEmbed({
							title: 'message: Mauvais adversaire !',
							message: "Utilise la commande sans option 'adversaire' pour jouer contre moi."
						})
					],
					flags: MessageFlags.Ephemeral
				});
			}
			if (opponent.id === userId) {
				return interaction.reply({
					embeds: [Embeds.errorEmbed({ title: 'message: Mauvais adversaire !', message: 'Tu ne peux pas te défier toi-même !' })],
					flags: MessageFlags.Ephemeral
				});
			}

			// Vérifier que l'adversaire a assez de rubis
			const opponentCheck = await container.economyService.view(opponent.id);
			if (!opponentCheck.success || opponentCheck.data.rubies < bet) {
				return interaction.reply({
					embeds: [Embeds.errorEmbed({ message: "Ton adversaire n'a pas assez de rubis pour accepter ce défi !" })],
					flags: MessageFlags.Ephemeral
				});
			}

			// Débiter la mise du joueur 1
			const transaction = await container.casinoService.transaction(userId, bet, 'remove');
			if (!transaction.success) return interaction.reply({ content: 'Erreur transaction.', flags: MessageFlags.Ephemeral });

			const initData = await container.moreOrLessService.initDeckAndDraw();
			if (!initData) {
				await container.casinoService.transaction(userId, bet, 'add');
				return interaction.reply({ content: 'Erreur deck.', flags: MessageFlags.Ephemeral });
			}

			const startingPlayer = Math.random() > 0.5 ? userId : opponent.id;

			// On prépare l'objet game
			const challengeData: MoreOrLessGame = {
				messageId: '', // Sera défini après le reply
				channelId: interaction.channelId,
				deckId: initData.deckId,
				bet: bet,
				player1: { id: userId, lives: lives },
				player2: { id: opponent.id, lives: lives },
				currentTurnId: startingPlayer,
				currentCard: initData.card,
				status: 'pending',
				totalLives: lives,
				totalCards: initData.totalCards,
				remainingCards: initData.remainingCards
			};

			// On génère le message via le builder V2 (Container)
			// Note : Comme on n'a pas encore l'ID du message, on passe un ID temporaire
			const initialPayload = MoreOrLessMessageBuilder.buildChallengeMessage(challengeData);

			await interaction.editReply({ ...initialPayload });

			// 3. Maintenant .id existe !
			challengeData.messageId = messageId;
			challengeData.challengeMessageId = messageId;

			// Enregistrer
			await container.moreOrLessService.registerChallenge(challengeData as MoreOrLessGame);

			// Update les boutons
			const updatedPayload = MoreOrLessMessageBuilder.buildChallengeMessage(challengeData);
			await interaction.editReply(updatedPayload);

			// Timer d'expiration du défi
			setTimeout(async () => {
				const challenge = container.moreOrLessService.getChallenge(messageId);
				if (challenge && challenge.status === 'pending') {
					await container.moreOrLessService.cancelChallenge(messageId);

					// OBLIGATOIRE : Créer un container pour afficher le texte
					const expiredContainer = new ContainerBuilder()
						.setAccentColor(colors.fail)
						.addTextDisplayComponents(
							new TextDisplayBuilder().setContent(
								`### ${emojis.redcheck} Proposition expirée\n<@${opponent.id}> n'a pas accepté défi dans le temps imparti...\nPeut-être une prochaine fois?`
							)
						);

					await interaction.editReply({
						flags: MessageFlags.IsComponentsV2,
						components: [expiredContainer.toJSON()]
					});
				}
			}, 60000);

			return;
		}

		// --- CAS PVE (CONTRE LE BOT) ---
		const transaction = await container.casinoService.transaction(userId, bet, 'remove');
		if (!transaction.success) {
			return interaction.reply({ content: 'Erreur de transaction.', flags: MessageFlags.Ephemeral });
		}

		const initData = await container.moreOrLessService.initDeckAndDraw();
		if (!initData) {
			await container.casinoService.transaction(userId, bet, 'add');
			// Attention : Si tu dois faire une erreur ici, utilise un autre reply ou un container d'erreur
			return interaction.editReply({
				components: [
					new ContainerBuilder()
						.setAccentColor(colors.fail)
						.addTextDisplayComponents(new TextDisplayBuilder().setContent('Erreur avec le paquet.'))
						.toJSON()
				]
			});
		}

		await new Promise((r) => setTimeout(r, 2000));

		const startingPlayer = Math.random() > 0.5 ? userId : 'bot';
		const gameData: MoreOrLessGame = {
			messageId: messageId,
			channelId: interaction.channelId,
			deckId: initData.deckId,
			bet: bet,
			player1: { id: userId, lives: lives },
			player2: { id: 'bot', lives: lives },
			currentTurnId: startingPlayer,
			currentCard: initData.card,
			status: 'playing',
			expiresAt: Date.now() + 30000,
			totalLives: lives,
			totalCards: initData.totalCards,
			remainingCards: initData.remainingCards
		};

		// 1. Afficher la carte en GRAND (Tirage initial)
		const initialDraw = MoreOrLessMessageBuilder.buildInitialDrawMessage(gameData);
		await interaction.editReply(initialDraw);

		// 2. Petite pause pour laisser le joueur voir la carte (2-3 secondes)
		await new Promise((r) => setTimeout(r, 4000));

		// 3. Enregistrer et passer au plateau de JEU RÉEL (avec Thumbnail)
		await container.moreOrLessService.registerGame(gameData);

		const gameMessage = MoreOrLessMessageBuilder.buildGameMessage(gameData);
		await interaction.editReply(gameMessage);

		// Lancer le tour du bot si nécessaire
		if (startingPlayer === 'bot') {
			setTimeout(async () => {
				await container.moreOrLessService.handleBotTurn(messageId);
			}, 4000);
		}

		return;
	}
}
