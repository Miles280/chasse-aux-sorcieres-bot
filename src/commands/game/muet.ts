import { ApplyOptions } from '@sapphire/decorators';
import { Command, container } from '@sapphire/framework';
import { ChatInputCommandInteraction, InteractionContextType, MessageFlags, PermissionFlagsBits } from 'discord.js';
import * as Embeds from '../../utils/embeds';

@ApplyOptions<Command.Options>({
	name: 'muet',
	description: 'Permet de mute ou démute manuellement tous les joueurs vivants de la partie.'
})
export class MuteCommand extends Command {
	public override registerApplicationCommands(registry: Command.Registry) {
		registry.registerChatInputCommand((builder) =>
			builder
				.setName(this.name)
				.setDescription(this.description)
				.setContexts([InteractionContextType.Guild])
				.setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels)
				.addStringOption((option) =>
					option
						.setName('action')
						.setDescription('Voulez-vous les mute ou les démute ?')
						.setRequired(true)
						.addChoices({ name: 'Mute', value: 'mute' }, { name: 'Démute', value: 'unmute' })
				)
		);
	}

	public override async chatInputRun(interaction: ChatInputCommandInteraction) {
		await interaction.deferReply({ flags: [MessageFlags.Ephemeral] });

		const action = interaction.options.getString('action', true);
		const shouldMute = action === 'mute';
		const guild = interaction.guild!;

		// 1. Récupération de la partie active
		const gameResponse = await container.inGameService.getActiveGame();
		if (!gameResponse.success || !gameResponse.data) {
			return interaction.editReply({
				embeds: [Embeds.errorEmbed({ title: 'Erreur', message: 'Aucune partie active trouvée.' })]
			});
		}

		const game = gameResponse.data;
		const players = game.gamePlayers ?? [];
		let successCount = 0;

		// 2. Application du mute/démute sur les joueurs vivants
		for (const player of players) {
			if (!player.isAlive || player.isSpectator) continue;

			if (player.user?.discordId) {
				try {
					const member = await guild.members.fetch(player.user.discordId).catch(() => null);
					if (member && member.voice.channelId) {
						await member.voice.setMute(shouldMute, `Commande manuelle /mute par ${interaction.user.tag}`);
						successCount++;
					}
				} catch (error) {
					console.error(`[Mute Command] Erreur pour le joueur ${player.user.discordId}:`, error);
				}
			}
		}

		// 3. Confirmation éphémère au MJ
		const actionText = shouldMute ? 'mutés' : 'démutés';
		return interaction.editReply({
			embeds: [
				Embeds.successEmbed({
					title: 'Action effectuée',
					message: `Les joueurs vivants présents en vocal ont bien été **${actionText}** (${successCount} joueur(s) concerné(s)).`
				})
			]
		});
	}
}
