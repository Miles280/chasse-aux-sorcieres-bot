import { InteractionHandler, InteractionHandlerTypes, container } from '@sapphire/framework';
import { ButtonInteraction, GuildMember, MessageFlags } from 'discord.js';
import { BlackjackMessageBuilder } from '../../../builders/BlackjackMessage.builder';
import * as Embeds from '../../../utils/embeds';

export class BlackjackButtonHandler extends InteractionHandler {
	public constructor(context: InteractionHandler.LoaderContext, options: InteractionHandler.Options) {
		super(context, { ...options, interactionHandlerType: InteractionHandlerTypes.Button });
	}

	public override parse(interaction: ButtonInteraction) {
		if (!interaction.customId.startsWith('bj:')) return this.none();
		return this.some();
	}

	public async run(interaction: ButtonInteraction) {
		const parts = interaction.customId.split(':');
		const action = parts[1]; // "hit", "stand", ou "replay"
		const userId = interaction.user.id;

		// =========================================
		// FONCTION UTILITAIRE : TIMER BOUTON REJOUER
		// =========================================
		const triggerReplayButtonTimeout = (gameStatus: string) => {
			if (gameStatus === 'finished') {
				setTimeout(() => {
					// Retire les composants 60s plus tard
					interaction.editReply({ components: [] }).catch(() => null);
				}, 60000);
			}
		};

		// =========================================
		// LOGIQUE : BOUTON REJOUER
		// =========================================
		if (action === 'replay') {
			const bet = parseInt(parts[2]);
			const ownerId = parts[3];

			if (userId !== ownerId) {
				return interaction.reply({
					embeds: [
						Embeds.errorEmbed({
							member: interaction.member as GuildMember,
							title: 'Petit voleur !',
							message: "Ce bouton n'est pas pour toi. Lance une nouvelle partie avec `/blackjack`."
						})
					],
					flags: MessageFlags.Ephemeral
				});
			}

			const check = await container.economyService.view(userId);
			if (!check.success || check.data.rubies < bet) {
				return interaction.reply({
					embeds: [Embeds.errorEmbed({ message: 'Pas assez de rubis pour rejouer !' })],
					flags: MessageFlags.Ephemeral
				});
			}

			// Débiter la mise
			const transaction = await container.casinoService.transaction(userId, bet, 'remove');
			if (!transaction.success) {
				return interaction.reply({
					embeds: [Embeds.errorEmbed({ message: 'Erreur lors du débit de la mise.' })],
					flags: MessageFlags.Ephemeral
				});
			}

			await interaction.message.edit({ components: [] });

			await interaction.deferReply();
			const response = await interaction.fetchReply();

			const channelId = interaction.channelId!;
			const game = await container.blackjackService.initGame(userId, bet, response.id, channelId);

			if (!game) {
				return interaction.followUp({
					embeds: [Embeds.errorEmbed({ message: 'Erreur lors du mélange du deck.' })],
					flags: MessageFlags.Ephemeral
				});
			}

			const msg = await BlackjackMessageBuilder.buildGameMessage(game);
			await interaction.editReply(msg as any);

			triggerReplayButtonTimeout(game.status);
			return;
		}

		// =========================================
		// LOGIQUE : BOUTONS EN JEU (Tirer/Rester)
		// =========================================
		const messageId = parts[2];
		const game = container.blackjackService.getGame(messageId);

		if (!game) return interaction.reply({ content: 'Partie expirée.', flags: MessageFlags.Ephemeral });
		if (interaction.user.id !== game.userId) return interaction.reply({ content: 'Pas ta partie !', flags: MessageFlags.Ephemeral });

		await interaction.deferUpdate();

		if (action === 'hit') {
			const updatedGame = await container.blackjackService.hit(messageId);
			const response = await BlackjackMessageBuilder.buildGameMessage(updatedGame!);
			await interaction.editReply(response);

			triggerReplayButtonTimeout(updatedGame!.status);
		} else if (action === 'stand') {
			const updatedGame = await container.blackjackService.stand(messageId);
			const response = await BlackjackMessageBuilder.buildGameMessage(updatedGame);
			await interaction.editReply(response);

			triggerReplayButtonTimeout(updatedGame.status);
		}

		return;
	}
}
