import { ApplyOptions } from '@sapphire/decorators';
import { Command, container } from '@sapphire/framework';
import { ChatInputCommandInteraction, InteractionContextType, ChannelType, MessageFlags, ForumChannel } from 'discord.js';
import { Camp } from '../../enums/Camp';
import { Alignment } from '../../enums/Alignment';
import * as Embeds from '../../utils/embeds';
import { RoleMessageBuilder } from '../../builders/game/RoleMessage.builder';

@ApplyOptions<Command.Options>({
	name: 'sync-roles',
	description: 'Synchronise les rôles de la Chasse aux Sorcières dans un salon Forum.'
})
export class SyncRolesCommand extends Command {
	public override registerApplicationCommands(registry: Command.Registry) {
		registry.registerChatInputCommand((builder) =>
			builder
				.setName(this.name)
				.setDescription(this.description)
				.setContexts([InteractionContextType.Guild])
				.addChannelOption((opt) =>
					opt
						.setName('salon')
						.setDescription('Le salon Forum où synchroniser les rôles.')
						.addChannelTypes(ChannelType.GuildForum)
						.setRequired(true)
				)
				.addStringOption((opt) =>
					opt
						.setName('camp')
						.setDescription('Filtrer la synchronisation par camp.')
						.setRequired(false)
						.addChoices(
							{ name: 'Villageois', value: Camp.VILLAGERS },
							{ name: 'Sorcières', value: Camp.WITCH },
							{ name: 'Indépendants', value: Camp.INDEPENDENT }
						)
				)
		);
	}

	public override async chatInputRun(interaction: ChatInputCommandInteraction) {
		const forum = interaction.options.getChannel('salon', true) as ForumChannel;
		const campOption = interaction.options.getString('camp') as Camp | null;

		// 1. Diffère l'interaction
		await interaction.deferReply({ flags: [MessageFlags.Ephemeral] });

		// 2. Récupération des rôles depuis l'API
		const targetRolesResponse = campOption ? await container.rolesService.getRolesByCamp(campOption) : await container.rolesService.getAllRoles();

		if (!targetRolesResponse.success) {
			return interaction.editReply({
				embeds: [Embeds.errorEmbed({ title: 'Erreur de récupération des rôles.', message: targetRolesResponse.error })]
			});
		}
		const rolesToSync = targetRolesResponse.data.sort((a, b) => {
			// 1er critère : Nombre de joueurs minimum (Décroissant)
			if (b.minPlayer !== a.minPlayer) {
				return b.minPlayer - a.minPlayer;
			}

			// 2e critère : Nom du rôle (Alphabétique Croissant : A-Z)
			// On utilise localeCompare pour gérer correctement les accents (ex: Sorcière)
			return b.name.localeCompare(a.name);
		});

		const allRolesResponse = await container.rolesService.getAllRoles();
		const allRolesNames = allRolesResponse.success && allRolesResponse.data ? allRolesResponse.data.map((r) => r.name) : [];

		// 3. Gestion et Création des Tags du Forum
		const tagsMap = await this.ensureForumTags(forum, campOption);

		// 4. Récupération des threads existants
		const activeThreads = await forum.threads.fetchActive();
		const archivedThreads = await forum.threads.fetchArchived();
		const allThreads = [...activeThreads.threads.values(), ...archivedThreads.threads.values()];

		let createdCount = 0;
		let updatedCount = 0;
		let deletedCount = 0;
		let errorCount = 0;

		// 5. Synchronisation des rôles (Création / Édition)
		for (const role of rolesToSync) {
			try {
				const embed = RoleMessageBuilder.buildRoleEmbed(role);
				const content = `__Minimum : **${role.minPlayer}** joueurs__`;

				// Détermination des tags à appliquer au post
				const roleTagsIds: string[] = [];
				const campLabel = this.getCampLabel(role.camp);
				if (tagsMap.has(campLabel)) roleTagsIds.push(tagsMap.get(campLabel)!);

				if (role.alignments) {
					for (const alignment of role.alignments) {
						const alignmentLabel = this.getAlignmentLabel(alignment);
						if (tagsMap.has(alignmentLabel)) roleTagsIds.push(tagsMap.get(alignmentLabel)!);
					}
				}

				// Recherche du thread
				const existingThread = allThreads.find((t) => t.name === role.name);

				if (existingThread) {
					const starterMessage = await existingThread.fetchStarterMessage().catch(() => null);

					if (starterMessage && starterMessage.author.id === container.client.user?.id) {
						await starterMessage.edit({ content, embeds: [embed] });

						const currentTags = existingThread.appliedTags;
						if (JSON.stringify(currentTags.sort()) !== JSON.stringify(roleTagsIds.sort())) {
							await existingThread.setAppliedTags(roleTagsIds);
						}
						updatedCount++;
					} else {
						await existingThread.delete();
						await forum.threads.create({
							name: role.name,
							message: { content, embeds: [embed] },
							appliedTags: roleTagsIds
						});
						createdCount++;
					}
				} else {
					await forum.threads.create({
						name: role.name,
						message: { content, embeds: [embed] },
						appliedTags: roleTagsIds
					});
					createdCount++;
				}
			} catch (error) {
				console.error(`Erreur lors de la synchronisation du rôle ${role.name}:`, error);
				errorCount++;
			}
		}

		// 6. Nettoyage des posts orphelins (Suppression)
		for (const thread of allThreads) {
			try {
				if (!allRolesNames.includes(thread.name)) {
					await thread.delete();
					deletedCount++;
				}
			} catch (error) {
				console.error(`Erreur lors de la suppression du thread ${thread.name}:`, error);
				errorCount++;
			}
		}

		// 7. Conclusion
		const resultMessage =
			`Modifications dans <#${forum.id}> :\n` +
			`> **${createdCount}** rôles créés,\n` +
			`> **${updatedCount}** rôles mis à jour,\n` +
			`> **${deletedCount}** posts supprimés.` +
			(errorCount > 0 ? `\n> ⚠️ **${errorCount}** erreurs rencontrées.` : '');

		return interaction.editReply({
			embeds: [
				Embeds.successEmbed({
					title: `Synchronisation terminée !`,
					message: resultMessage
				})
			]
		});
	}

	/**
	 * Gère dynamiquement les tags du salon Forum.
	 * Si un camp est sélectionné, seul ce camp sera présent dans les tags du salon (avec les alignements).
	 */
	private async ensureForumTags(forum: ForumChannel, selectedCamp: Camp | null): Promise<Map<string, string>> {
		const requiredTags: string[] = [];

		// 1. Détermination des tags de camp à assurer
		if (selectedCamp) {
			// Un seul camp spécifique
			requiredTags.push(this.getCampLabel(selectedCamp));
		} else {
			// Tous les camps si synchronisation globale
			requiredTags.push(...Object.values(this.CAMP_TAGS));
		}

		// 2. On ajoute toujours tous les alignements
		requiredTags.push(...Object.values(this.ALIGNMENT_TAGS));

		const currentTags: { id?: string; name: string }[] = [...forum.availableTags];
		let tagsUpdated = false;

		for (const tagName of requiredTags) {
			if (!currentTags.some((t) => t.name === tagName)) {
				currentTags.push({ name: tagName });
				tagsUpdated = true;
			}
		}

		let finalTags = forum.availableTags;
		if (tagsUpdated) {
			const updatedForum = await forum.edit({ availableTags: currentTags });
			finalTags = updatedForum.availableTags;
		}

		const tagsMap = new Map<string, string>();
		for (const tag of finalTags) {
			tagsMap.set(tag.name, tag.id);
		}

		return tagsMap;
	}

	private getCampLabel(camp: Camp): string {
		const labels = {
			[Camp.VILLAGERS]: this.CAMP_TAGS.VILLAGERS,
			[Camp.WITCH]: this.CAMP_TAGS.WITCH,
			[Camp.INDEPENDENT]: this.CAMP_TAGS.INDEPENDENT
		};
		return labels[camp];
	}

	private getAlignmentLabel(alignment: Alignment): string {
		const labels = {
			[Alignment.KILLER]: this.ALIGNMENT_TAGS.KILLER,
			[Alignment.INFORMER]: this.ALIGNMENT_TAGS.INFORMER,
			[Alignment.LEADER]: this.ALIGNMENT_TAGS.LEADER,
			[Alignment.PROTECTOR]: this.ALIGNMENT_TAGS.PROTECTOR,
			[Alignment.SUPPORT]: this.ALIGNMENT_TAGS.SUPPORT
		};
		return labels[alignment];
	}

	// Constantes pour les noms de tags
	private readonly CAMP_TAGS = {
		VILLAGERS: 'Villageois',
		WITCH: 'Sorcières',
		INDEPENDENT: 'Indépendants'
	} as const;

	private readonly ALIGNMENT_TAGS = {
		KILLER: 'Tueur',
		INFORMER: 'Informateur',
		LEADER: 'Meneur',
		PROTECTOR: 'Protecteur',
		SUPPORT: 'Support'
	} as const;
}
