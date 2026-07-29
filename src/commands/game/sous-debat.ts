import { ApplyOptions } from '@sapphire/decorators';
import { Command, container } from '@sapphire/framework';
import { ChatInputCommandInteraction, InteractionContextType, MessageFlags, PermissionFlagsBits, TextChannel, User } from 'discord.js';
import * as Embeds from '../../utils/embeds';

@ApplyOptions<Command.Options>({
	name: 'sous-debat',
	description: 'Lance un sous-débat de 2 minutes entre membres spécifiques, les démute puis les remute.'
})
export class SousDebatCommand extends Command {
	public override registerApplicationCommands(registry: Command.Registry) {
		registry.registerChatInputCommand((builder) => {
			builder
				.setName(this.name)
				.setDescription(this.description)
				.setContexts([InteractionContextType.Guild])
				.setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels)
				.addUserOption((option) =>
					option //
						.setName('membre1')
						.setDescription('Premier membre du sous-débat.')
						.setRequired(true)
				)
				.addUserOption((option) =>
					option //
						.setName('membre2')
						.setDescription('Deuxième membre du sous-débat.')
						.setRequired(true)
				)
				.addUserOption((option) =>
					option //
						.setName('membre3')
						.setDescription('Troisième membre du sous-débat.')
						.setRequired(false)
				)
				.addUserOption((option) =>
					option //
						.setName('membre4')
						.setDescription('Quatrième membre du sous-débat.')
						.setRequired(false)
				)
				.addUserOption((option) =>
					option //
						.setName('membre5')
						.setDescription('Cinquième membre du sous-débat.')
						.setRequired(false)
				);

			return builder;
		});
	}

	public override async chatInputRun(interaction: ChatInputCommandInteraction) {
		await interaction.deferReply({ flags: [MessageFlags.Ephemeral] });

		const guild = interaction.guild!;

		// 1. Récupération des membres renseignés (options facultatives non remplies = ignorées)
		const rawUsers: User[] = [];
		for (const optionName of ['membre1', 'membre2', 'membre3', 'membre4', 'membre5']) {
			const user = interaction.options.getUser(optionName);
			if (user) rawUsers.push(user);
		}

		// 2. Déduplication (au cas où le même membre est sélectionné deux fois)
		const uniqueUsers = [...new Map(rawUsers.map((u) => [u.id, u])).values()];

		if (uniqueUsers.length < 2) {
			return interaction.editReply({
				embeds: [
					Embeds.errorEmbed({
						title: 'Erreur',
						message: `Il faut au moins ${2} membres différents pour lancer un sous-débat.`
					})
				]
			});
		}

		// 3. Récupération de la partie active
		const gameResponse = await container.inGameService.getActiveGame();
		if (!gameResponse.success || !gameResponse.data) {
			return interaction.editReply({
				embeds: [Embeds.errorEmbed({ title: 'Erreur', message: 'Aucune partie active trouvée.' })]
			});
		}
		const game = gameResponse.data;
		const players = game.gamePlayers ?? [];

		// 4. On vérifie que chaque membre ciblé fait bien partie de la partie en cours
		const selectedPlayers = [];
		const notInGame: string[] = [];

		for (const user of uniqueUsers) {
			const player = players.find((p) => p.user?.discordId === user.id);
			if (player) {
				selectedPlayers.push(player);
			} else {
				notInGame.push(`<@${user.id}>`);
			}
		}

		if (notInGame.length > 0) {
			return interaction.editReply({
				embeds: [
					Embeds.errorEmbed({
						title: 'Erreur',
						message: `Ces membres ne font pas partie de la partie en cours : ${notInGame.join(', ')}.`
					})
				]
			});
		}

		// 5. Récupération du salon de vote (ou salon courant à défaut), comme pour /debat
		const voteChannelId = game.discordChannels['votesChannelId'];
		const voteChannel = voteChannelId ? (guild.channels.cache.get(voteChannelId) as TextChannel) : (interaction.channel as TextChannel);

		// 6. Lancement du chrono de 2 minutes, uniquement sur les membres sélectionnés
		container.inGameService.runDebateTimeline(guild, voteChannel, selectedPlayers, 2);

		// 7. Confirmation immédiate au MJ
		const mentions = uniqueUsers.map((u) => `<@${u.id}>`).join(', ');
		return interaction.editReply({
			embeds: [
				Embeds.successEmbed({
					title: 'Sous-débat lancé !',
					message: `Le sous-débat de **2 minutes** est lancé entre : ${mentions}.`
				})
			]
		});
	}
}
