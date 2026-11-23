import { ApplyOptions } from '@sapphire/decorators';
import { Command, container } from '@sapphire/framework';
import { ChatInputCommandInteraction, InteractionContextType, MessageFlags, PermissionFlagsBits } from 'discord.js';
import { GameMessageBuilder } from '../../builders/game/GameMessage.builder';
import { Camp } from '../../enums/Camp';
import * as Embeds from '../../utils/embeds';

@ApplyOptions<Command.Options>({
	name: 'main-du-destin',
	description: 'Pioche au hasard un joueur éligible et envoie le résultat aux Sorcières.'
})
export class MainDuDestinCommand extends Command {
	public override registerApplicationCommands(registry: Command.Registry) {
		registry.registerChatInputCommand((builder) => {
			builder
				.setName(this.name)
				.setDescription(this.description)
				.setContexts([InteractionContextType.Guild])
				.setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels);
		});
	}

	public override async chatInputRun(interaction: ChatInputCommandInteraction) {
		await interaction.deferReply({ flags: [MessageFlags.Ephemeral] });

		try {
			// 1. Récupérer la partie en cours
			const activeGameResponse = await container.inGameService.getActiveGame();
			if (!activeGameResponse.success || !activeGameResponse.data) {
				return interaction.editReply({
					embeds: [Embeds.errorEmbed({ title: 'Erreur', message: 'Aucune partie active trouvée sur ce serveur.' })]
				});
			}
			const game = activeGameResponse.data;

			// 2. Récupérer la config du serveur (pour le rôle invulnérabilité, salons, etc.)
			const configResponse = await container.serverConfigService.getConfig(interaction.guildId!);
			if (!configResponse.success) {
				return interaction.editReply({
					embeds: [Embeds.errorEmbed({ title: 'Erreur Config', message: configResponse.error ?? 'Configuration introuvable.' })]
				});
			}
			const config = configResponse.data;

			// 3. Récupérer les joueurs de la partie en cours
			const players: any[] = game.gamePlayers ?? [];
			if (players.length === 0) {
				return interaction.editReply({
					embeds: [Embeds.errorEmbed({ title: 'Aucun joueur', message: 'Aucun joueur trouvé dans la partie en cours.' })]
				});
			}

			// 4. Filtrer : exclure les joueurs invulnérables et ceux du camp des Sorcières
			const invulnerabilityDiscordRoleId = config.invulnerabilityRoleId;

			if (invulnerabilityDiscordRoleId && interaction.guild) {
				await interaction.guild.members.fetch().catch(() => null);
			}

			const eligiblePlayers = players.filter((player: any) => {
				const discordId: string | undefined = player.user?.discordId ?? player.discordId;
				const member = discordId && interaction.guild ? interaction.guild.members.cache.get(discordId) : null;

				// Exclure si le joueur possède le rôle Discord d'invulnérabilité
				if (invulnerabilityDiscordRoleId && member?.roles.cache.has(invulnerabilityDiscordRoleId)) {
					return false;
				}

				// Exclure les joueurs du camp des Sorcières
				if (player.realRole?.camp === Camp.WITCH) {
					return false;
				}

				return true;
			});

			if (eligiblePlayers.length === 0) {
				return interaction.editReply({
					embeds: [
						Embeds.errorEmbed({
							title: 'Aucun joueur éligible',
							message: "Aucun joueur restant après exclusion des Sorcières et des joueurs ayant l'invulnérabilité."
						})
					]
				});
			}

			// 5. Tirer au hasard l'un des joueurs restants
			const randomIndex = Math.floor(Math.random() * eligiblePlayers.length);
			const chosenPlayer = eligiblePlayers[randomIndex];

			// 6. Envoie du résultat pour demander confirmation au MJ via boutons
			return interaction.editReply({
				...GameMessageBuilder.buildMainDuDestin(chosenPlayer.user.discordId)
			});
		} catch (error) {
			container.logger.error(error);
			return interaction.editReply({
				embeds: [
					Embeds.errorEmbed({
						title: 'Erreur fatale',
						message: "Une erreur inattendue est survenue lors de l'exécution de la commande."
					})
				],
				components: []
			});
		}
	}
}
