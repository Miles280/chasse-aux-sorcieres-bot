import { ApplyOptions } from '@sapphire/decorators';
import { Command, container } from '@sapphire/framework';
import { ChatInputCommandInteraction, InteractionContextType, MessageFlags, PermissionFlagsBits, TextChannel } from 'discord.js';
import { setTimeout as sleep } from 'timers/promises';
import * as Embeds from '../../utils/embeds';
import { GamePlayerInterface } from '../../models/game/Game.interface';

@ApplyOptions<Command.Options>({
	name: 'debat',
	description: 'Lance un chronomètre de débat, démute les joueurs, puis les remute à la fin.'
})
export class DebateCommand extends Command {
	public override registerApplicationCommands(registry: Command.Registry) {
		registry.registerChatInputCommand((builder) =>
			builder
				.setName(this.name)
				.setDescription(this.description)
				.setContexts([InteractionContextType.Guild])
				.setDefaultMemberPermissions(PermissionFlagsBits.MuteMembers) // Requis pour mute/démute
				.addIntegerOption((option) =>
					option.setName('temps').setDescription('Le temps du débat en minutes.').setRequired(true).setMinValue(1).setMaxValue(10)
				)
		);
	}

	public override async chatInputRun(interaction: ChatInputCommandInteraction) {
		await interaction.deferReply({ flags: [MessageFlags.Ephemeral] });

		const durationMinutes = interaction.options.getInteger('temps', true);
		const guild = interaction.guild!;

		// 1. Récupération de la partie
		const gameResponse = await container.inGameService.getActiveGame();
		if (!gameResponse.success || !gameResponse.data) {
			return interaction.editReply({
				embeds: [Embeds.errorEmbed({ title: 'Erreur', message: 'Aucune partie active trouvée.' })]
			});
		}
		const game = gameResponse.data;

		const voteChannelId = game.discordChannels['votesChannelId'];
		const voteChannel = voteChannelId ? (guild.channels.cache.get(voteChannelId) as TextChannel) : (interaction.channel as TextChannel);

		// 2. On lance la gestion du chrono en tâche de fond
		this.runDebateTimeline(guild, voteChannel, game.gamePlayers ?? [], durationMinutes);

		// 3. Confirmation immédiate au MJ
		return interaction.editReply({
			embeds: [
				Embeds.successEmbed({
					title: 'Débat lancé !',
					message: `Le chrono de **${durationMinutes} minute(s)** est lancé. Les joueurs ont été démutés.`
				})
			]
		});
	}

	/**
	 * Gère la chronologie du débat en arrière-plan.
	 */
	private async runDebateTimeline(guild: any, voteChannel: TextChannel, players: GamePlayerInterface[], durationMinutes: number) {
		const endTimeUnix = Math.floor(Date.now() / 1000) + durationMinutes * 60;

		// 1. Démute de tout le monde
		for (const player of players) {
			if (!player.isAlive || player.isSpectator) continue;

			if (player.user?.discordId) {
				const member = await guild.members.fetch(player.user.discordId).catch(() => null);
				if (member && member.voice.channelId) {
					await member.voice.setMute(false, 'Début du temps de débat').catch(() => null);
				}
			}
		}

		// 2. Message de début (On sauvegarde le message dans une variable "startMsg")
		let startMsg: any = null;
		if (voteChannel) {
			startMsg = await voteChannel
				.send({
					embeds: [
						Embeds.successEmbed({
							title: 'Le débat est ouvert !',
							message: `Vous pouvez parler. Fin du temps imparti <t:${endTimeUnix}:R>.`
						})
					]
				})
				.catch(() => null);
		}

		// 3. Chrono et alerte éphémère la dernière minute
		const durationMs = durationMinutes * 60 * 1000;
		const oneMinuteMs = 60 * 1000;

		if (durationMinutes > 1) {
			const warningDelay = durationMs - oneMinuteMs;

			// On attend jusqu'à la dernière minute
			await sleep(warningDelay);

			// Envoi de l'avertissement
			if (voteChannel) {
				const warningMsg = await voteChannel
					.send({
						content: "⚠️ **Il ne reste plus qu'une minute de débat !**"
					})
					.catch(() => null);

				// Auto-suppression après 10s
				if (warningMsg) {
					setTimeout(() => warningMsg.delete().catch(() => null), 10_000);
				}
			}

			// On attend la dernière minute restante
			await sleep(oneMinuteMs);
		} else {
			// Si le débat ne dure qu'une minute de base, on attend direct la fin
			await sleep(durationMs);
		}

		// 4. Fin du débat et remute
		for (const player of players) {
			if (!player.isAlive || player.isSpectator) continue;

			if (player.user?.discordId) {
				const member = await guild.members.fetch(player.user.discordId).catch(() => null);
				if (member && member.voice.channelId) {
					await member.voice.setMute(true, 'Fin du temps de débat').catch(() => null);
				}
			}
		}

		// 5. Modification de l'embed de départ ET petit message de fin
		if (voteChannel) {
			// On modifie l'embed de départ pour le transformer en message d'erreur rouge
			if (startMsg) {
				await startMsg
					.edit({
						embeds: [
							Embeds.errorEmbed({
								title: 'Fin du débat !',
								message: "Il est l'heure de voter pour ceux ne l'ayant pas encore fait."
							})
						]
					})
					.catch(() => null);
			}

			// On envoie le petit ping rapide
			const endPingMsg = await voteChannel
				.send({
					content: '**Le débat est terminé !** Place aux votes.'
				})
				.catch(() => null);

			// Auto-suppression du petit message après 10 secondes
			if (endPingMsg) {
				setTimeout(() => endPingMsg.delete().catch(() => null), 10_000);
			}
		}
	}
}
