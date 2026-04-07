import { ApplyOptions } from '@sapphire/decorators';
import { Command, container } from '@sapphire/framework';
import { ContainerBuilder, InteractionContextType, MessageFlags, TextDisplayBuilder } from 'discord.js';
import { MoreOrLessMessageBuilder } from '../../builders/MoreOrLessMessage.builder';
import { MoreOrLessGame } from '../../models/MoreOrLessGame.interface';
import { colors } from '../../utils/customColors';
import { emojis } from '../../utils/emojis';
import * as Embeds from '../../utils/embeds';

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
				.addIntegerOption((opt) => opt.setName('mise').setDescription('Montant à miser').setMinValue(10).setMaxValue(500).setRequired(true))
				.addUserOption((opt) => opt.setName('adversaire').setDescription('Joueur à défier'))
				.addIntegerOption((opt) => opt.setName('vies').setDescription('Nombre de vies').setMinValue(2).setMaxValue(5))
		);
	}

	public override async chatInputRun(interaction: Command.ChatInputCommandInteraction) {
		const bet = interaction.options.getInteger('mise', true);
		const opponent = interaction.options.getUser('adversaire');
		const lives = interaction.options.getInteger('vies') ?? 3;
		const userId = interaction.user.id;

		// 1. Vérification économique du joueur
		const check = await container.economyService.view(userId);
		if (!check.success || check.data.rubies < bet) {
			return interaction.reply({
				embeds: [Embeds.errorEmbed({ message: 'Pas assez de rubis !' })],
				flags: MessageFlags.Ephemeral
			});
		}

		// 2. MODE DUEL (PvP)
		if (opponent) {
			// 2.1 Validation adversaire
			if (opponent.bot || opponent.id === userId) {
				return interaction.reply({
					embeds: [
						Embeds.errorEmbed({
							message: opponent.bot
								? 'Utilise la commande sans adversaire pour jouer contre moi.'
								: 'Tu ne peux pas te défier toi-même !'
						})
					],
					flags: MessageFlags.Ephemeral
				});
			}

			// 2.2 Vérification économique adversaire
			const opponentCheck = await container.economyService.view(opponent.id);
			if (!opponentCheck.success || opponentCheck.data.rubies < bet) {
				return interaction.reply({
					embeds: [Embeds.errorEmbed({ message: "Ton adversaire n'a pas assez de rubis !" })],
					flags: MessageFlags.Ephemeral
				});
			}

			// 2.3 Débit joueur
			const transaction = await container.casinoService.transaction(userId, bet, 'remove');
			if (!transaction.success) {
				return interaction.reply({ content: 'Erreur transaction.', flags: MessageFlags.Ephemeral });
			}

			// 2.4 Initialisation deck
			const initData = await container.moreOrLessService.initDeckAndDraw();
			if (!initData) {
				await container.casinoService.transaction(userId, bet, 'add');
				return interaction.reply({ content: 'Erreur deck.', flags: MessageFlags.Ephemeral });
			}

			const startingPlayer = Math.random() > 0.5 ? userId : opponent.id;

			// 2.5 Préparation des données (messageId sera rempli après le reply)
			const challengeData: MoreOrLessGame = {
				messageId: '',
				channelId: interaction.channelId,
				deckId: initData.deckId,
				bet,
				player1: { id: userId, lives },
				player2: { id: opponent.id, lives },
				currentTurnId: startingPlayer,
				currentCard: initData.card,
				status: 'pending',
				totalLives: lives,
				totalCards: initData.totalCards,
				remainingCards: initData.remainingCards,
				challengeMessageId: ''
			};

			// 2.6 Envoi du défi (On utilise reply pour le PING)
			const challengeMessage = MoreOrLessMessageBuilder.buildChallengeMessage(challengeData);

			const response = await interaction.reply({
				...challengeMessage,
				withResponse: true
			});

			const messageId = response.resource!.message!.id;
			challengeData.messageId = messageId;
			challengeData.challengeMessageId = messageId;

			await container.moreOrLessService.registerChallenge(challengeData);

			await interaction.editReply(MoreOrLessMessageBuilder.buildChallengeMessage(challengeData));

			// 2.7 Timeout du défi
			setTimeout(async () => {
				const challenge = container.moreOrLessService.getChallenge(messageId);
				if (!challenge || challenge.status !== 'pending') return;

				await container.moreOrLessService.cancelChallenge(messageId);

				const expired = new ContainerBuilder()
					.setAccentColor(colors.fail)
					.addTextDisplayComponents(
						new TextDisplayBuilder().setContent(`### ${emojis.redcheck} Proposition expirée\n<@${opponent.id}> n'a pas répondu...`)
					);

				await interaction.editReply({
					flags: MessageFlags.IsComponentsV2,
					components: [expired.toJSON()]
				});
			}, 60000);

			return;
		}

		// 3. MODE SOLO (PvE)
		const transaction = await container.casinoService.transaction(userId, bet, 'remove');
		if (!transaction.success) {
			return interaction.reply({ content: 'Erreur de transaction.', flags: MessageFlags.Ephemeral });
		}

		const initData = await container.moreOrLessService.initDeckAndDraw();
		if (!initData) {
			await container.casinoService.transaction(userId, bet, 'add');
			return interaction.reply({
				embeds: [Embeds.errorEmbed({ message: 'Erreur avec le paquet.' })],
				flags: MessageFlags.Ephemeral
			});
		}

		const startingPlayer = Math.random() > 0.5 ? userId : 'bot';

		const gameData: MoreOrLessGame = {
			messageId: '',
			channelId: interaction.channelId,
			deckId: initData.deckId,
			bet,
			player1: { id: userId, lives },
			player2: { id: 'bot', lives },
			currentTurnId: startingPlayer,
			currentCard: initData.card,
			status: 'playing',
			expiresAt: Date.now() + 30000,
			totalLives: lives,
			totalCards: initData.totalCards,
			remainingCards: initData.remainingCards
		};

		// 3.3 Affichage tirage initial (reply pour créer le message)
		const response = await interaction.reply({
			...MoreOrLessMessageBuilder.buildInitialDrawMessage(gameData),
			withResponse: true
		});

		const messageId = response.resource!.message!.id;
		gameData.messageId = messageId;

		await new Promise((r) => setTimeout(r, 4000));

		// 3.4 Lancement partie (editReply car le message existe déjà)
		await container.moreOrLessService.registerGame(gameData);
		await interaction.editReply(MoreOrLessMessageBuilder.buildGameMessage(gameData));

		if (startingPlayer === 'bot') {
			setTimeout(() => container.moreOrLessService.handleBotTurn(messageId), 4000);
		}

		return;
	}
}
