import { ApplyOptions } from '@sapphire/decorators';
import { Command } from '@sapphire/framework';
import { InteractionContextType, MessageFlags } from 'discord.js';
import { container } from '@sapphire/framework';
import { GameMessageBuilder } from '../../builders/game/GameMessage.builder';
import * as Embeds from '../../utils/embeds';

@ApplyOptions<Command.Options>({
	name: 'lancement',
	description: "Lance la partie qui est en cours d'inscription."
})
export class LancementCommand extends Command {
	public override registerApplicationCommands(registry: Command.Registry) {
		registry.registerChatInputCommand((builder) =>
			builder
				.setName(this.name)
				.setDescription(this.description)
				.setContexts([InteractionContextType.Guild])
				.addStringOption((opt) =>
					opt //
						.setName('variante')
						.setDescription('Le mode de jeu dans lequel la partie doit être lancée.')
						.addChoices(
							{ name: 'Classique', value: 'classic' },
							{ name: 'Compo Cachée', value: 'hidden' },
							{ name: 'Quartier résidentiel', value: 'neighborhood' }
						)
				)
				.addBooleanOption((opt) =>
					opt //
						.setName('verification')
						.setDescription('Ajoute une phase de vérification de la distribution des rôles.')
				)
		);
	}

	public override async chatInputRun(interaction: Command.ChatInputCommandInteraction) {
		await interaction.deferReply({ flags: MessageFlags.Ephemeral });

		const gameMode = interaction.options.getString('variante') || 'classic';
		const check = interaction.options.getBoolean('verification') || false;

		try {
			// 1. Récupération de l'ID de la partie en attente
			const waitingGameRes = await container.inscriptionService.getWaitingGame();
			if (!waitingGameRes.success || !waitingGameRes.data) {
				return interaction.editReply({
					embeds: [Embeds.errorEmbed({ title: 'Erreur', message: "Aucune partie n'est prête à être lancée." })]
				});
			}

			const game = waitingGameRes.data;

			if (check) {
				// --- PHASE 1 : PREVIEW (REROLL / VALIDER) ---
				const previewRes = await container.gameLauncherService.getPreview(game.id);

				if (!previewRes.success) {
					return interaction.editReply({
						embeds: [Embeds.errorEmbed({ title: 'Erreur', message: previewRes.error })]
					});
				}

				const distribution = previewRes.data.distribution;

				const message = GameMessageBuilder.buildPreviewDistribution(game.id, gameMode, distribution);

				container.gameLauncherService.setPreviewCache(game.id, distribution);

				return interaction.editReply(message);
			} else {
				// --- PHASE 2 : FAST START (On délègue tout au service) ---
				await container.gameLauncherService.processLaunch(interaction.guild!, game, []);

				return interaction.editReply({
					embeds: [
						Embeds.successEmbed({
							title: 'Lancement réalisé !',
							message: 'La partie a été lancée avec succès et les salons sont créés !'
						})
					]
				});
			}
		} catch (error: any) {
			console.error(error);
			return interaction.editReply({
				embeds: [
					Embeds.successEmbed({
						message: error.message
					})
				]
			});
		}
	}
}
