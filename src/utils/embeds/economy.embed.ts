import { EmbedBuilder, GuildMember } from 'discord.js';
import { emojis } from '../emojis';
import { formatTransactions } from '../formatTransactions';
import { formatTransactionLabel } from '../transactionLabels';
import { ConversionData, ConversionRates, DailyReward, EconomyAction, EconomyEmbedOptions, TransactionHistory } from '../../models/Economy.interface';
import { colors } from '../customColors';
import { getRandomDailyMessage } from '../dailyMessages';

export function bourseEmbed(member: GuildMember, gems: number, rubies: number, transactionsText: string): EmbedBuilder {
	return new EmbedBuilder()
		.setAuthor({
			name: member.displayName,
			iconURL: member.user.displayAvatarURL()
		})
		.setTitle(`${emojis.purplecheck} __Bourse de ${member.displayName}__`)
		.addFields(
			{ name: 'Contenu :', value: `> \`${gems.toLocaleString('fr-FR')}\` ${emojis.gems}`, inline: true },
			{ name: '\u200B', value: `> \`${rubies.toLocaleString('fr-FR')}\` ${emojis.rubies}`, inline: true }
		)
		.addFields({
			name: '\nDernières transactions :',
			value: transactionsText || 'Aucune transaction.'
		})
		.setColor(colors.purpleWitch)
		.setFooter({ text: 'Essayez /boutique et /historique !' });
}

const ACTIONS: Record<EconomyAction, { color: number; title: string; format: (id: string, amount: number, emoji: string) => string }> = {
	add: {
		color: 0x3bd16f, // Vert
		title: `${emojis.greencheck} Ajout effectué`,
		format: (id, amount, emoji) => `Vous avez ajouté **+${amount.toLocaleString()} ${emoji}** au compte de <@${id}>.`
	},
	remove: {
		color: 0xff4d4d, // Rouge
		title: `${emojis.redcheck} Retrait effectué`,
		format: (id, amount, emoji) => `Vous avez retiré **-${amount.toLocaleString()} ${emoji}** du compte de <@${id}>.`
	},
	set: {
		color: 0x3b82f6, // Bleu
		title: `${emojis.bluecheck} Solde défini`,
		format: (id, amount, emoji) => `Le nouveau solde de <@${id}> est de **${amount.toLocaleString()} ${emoji}**.`
	},
	give: {
		color: 0xff6d2d, // Orange
		title: `${emojis.orangecheck} Transfert effectué`,
		format: (id, amount, emoji) => `Vous avez donné **${amount.toLocaleString()} ${emoji}** à <@${id}>.`
	}
};

export function economyActionEmbed(opts: EconomyEmbedOptions) {
	const { action, currency, update, targetId, amount } = opts;
	const config = ACTIONS[action];

	// 1. Choix de l'emoji et du label
	const isGems = currency === 'gems';
	const emoji = isGems ? emojis.gems : emojis.rubies;

	// 2. Extraction dynamique des valeurs (Zéro calcul ici !)
	// On va chercher la valeur exacte dans les objets reçus de l'API
	const oldValue = isGems ? update.previous.gems : update.previous.rubies;
	const newValue = isGems ? update.current.gems : update.current.rubies;

	// 3. Formatage propre des nombres (ex: 1 000 au lieu de 1000)
	const oldFmt = oldValue.toLocaleString('fr-FR');
	const newFmt = newValue.toLocaleString('fr-FR');

	// 4. Création de l'embed
	return new EmbedBuilder()
		.setColor(config.color)
		.setTitle(config.title)
		.setDescription(config.format(targetId, amount, emoji))
		.addFields([
			{
				// Ex: "💎 Gemmes modifiées :"
				name: `${emoji} Solde modifié :`,
				// Ex: "1 000 💎 → 1 500 💎"
				value: `\`${oldFmt}\` ${emoji} **→** \`${newFmt}\` ${emoji}`,
				inline: true
			}
		]);
}

function formatActiveFilters(types: string[]) {
	if (!types.length) return '**Filtres actifs :** Tous';

	return `**Filtres actifs :** ${types.map((t) => `\`${formatTransactionLabel(t)}\``).join(' + ')}`;
}

export function buildHistoryEmbed(
	member: GuildMember,
	history: TransactionHistory, // On utilise maintenant l'interface propre
	types: string[]
): EmbedBuilder {
	// 1. On extrait les données pour plus de lisibilité
	const { items, pagination } = history;

	return (
		new EmbedBuilder()
			.setAuthor({
				name: member.displayName,
				iconURL: member.user.displayAvatarURL()
			})
			.setTitle(`${emojis.purplecheck} __Historique des transactions de ${member.displayName}__`)
			// 2. On utilise 'items' au lieu de 'transactions'
			.setDescription(formatActiveFilters(types) + '\n\n' + (items.length > 0 ? formatTransactions(items) : '*Aucune transaction trouvée.*'))
			// 3. On utilise les nouvelles clés de pagination
			.setFooter({
				text: `Page ${pagination.currentPage}/${pagination.totalPages}  •  Transactions totales : ${pagination.totalItems}`
			})
			.setColor(colors.purpleWitch)
	);
}

export function conversionEmbed(member: GuildMember, data: ConversionData): EmbedBuilder {
	const { roleId, rate, converted, rubiesEarned, previous, current } = data;

	const prevGems = previous.gems.toLocaleString();
	const newGems = current.gems.toLocaleString();

	const prevRubies = previous.rubies.toLocaleString();
	const newRubies = current.rubies.toLocaleString();

	const rankDisplay = roleId ? `<@&${roleId}>` : '**Aucun**';

	return new EmbedBuilder()
		.setAuthor({
			name: member.displayName,
			iconURL: member.user.displayAvatarURL()
		})
		.setTitle(`${emojis.purplecheck} Conversion effectuée`)
		.setDescription(
			`Chaque gemme vaut \`${rate.toLocaleString()}\` ${emojis.rubies} pour votre rang : ${rankDisplay}.\nConversion effectuée : **${converted.toLocaleString()} ${emojis.gems}** → **${rubiesEarned.toLocaleString()} ${emojis.rubies}**.`
		)
		.addFields(
			{
				name: `${emojis.gems} Gemmes :`,
				value: `\`${prevGems}\` ${emojis.gems} **→** \`${newGems}\` ${emojis.gems}`,
				inline: true
			},
			{
				name: `${emojis.rubies} Rubis :`,
				value: `\`${prevRubies}\` ${emojis.rubies} **→** \`${newRubies}\` ${emojis.rubies}`,
				inline: true
			}
		)
		.setColor(colors.purpleWitch)
		.setFooter({ text: 'Ne laissez pas vos rubis dormir… le casino les réclame !' });
}

export function conversionRateEmbed(member: GuildMember, data: ConversionRates): EmbedBuilder {
	// 1. On blinde la déstructuration avec des valeurs par défaut
	// On suppose un taux de base (ex: 1.0) si currentRate est absent
	const { currentRoleId, currentRate = 0, rates = [] } = data;

	// 2. Gestion du texte de header
	const headerText = currentRoleId ? `Vous êtes actuellement au rang de <@&${currentRoleId}>.` : `Vous n'avez encore acheté aucun rang social.`;

	// 3. Sécurité sur le toLocaleString()
	const formattedRate = (currentRate ?? 5).toLocaleString();
	const subHeaderText = `Chacune de vos gemmes vaut **${formattedRate} ${emojis.rubies}**.`;

	// 4. On s'assure que rates est bien un tableau avant le .map()
	const ratesList =
		(rates ?? [])
			.map((r) => {
				const roleMention = r.roleId ? `<@&${r.roleId}>` : '**Rôle inconnu**';
				// Sécurité sur r.rate également
				const rRate = (r.rate ?? 0).toLocaleString();

				const rateText = `> \`1\` ${emojis.gems} = \`${rRate}\` ${emojis.rubies} ⟶ ${roleMention}`;

				return r.isCurrent ? `${rateText} *(votre rang actuel)*` : rateText;
			})
			.join('\n') || '> *Aucun taux configuré.*'; // Fallback si la liste est vide

	return new EmbedBuilder()
		.setAuthor({
			name: member.displayName,
			iconURL: member.user.displayAvatarURL()
		})
		.setTitle(`${emojis.purplecheck} Taux de conversion`)
		.setDescription(`${headerText}\n${subHeaderText}\n\n${ratesList}`)
		.setColor(colors.purpleWitch);
}

export function dailyEmbed(data: DailyReward): EmbedBuilder {
	const { reward, previous_balance, current_balance, details } = data;
	const { roll_result, multipliers } = details;

	const prevFmt = previous_balance.toLocaleString();
	const currentFmt = current_balance.toLocaleString();

	// Récupération d'un message aléatoire "pro"
	const randomMoodText = getRandomDailyMessage(roll_result.type);

	return new EmbedBuilder()
		.setTitle(`${emojis.purplecheck} Récompense journalière`)
		.setColor(colors.purpleWitch)
		.setDescription(
			`*${randomMoodText}*\n` +
				`Vous recevez **+${reward.toLocaleString()}** ${emojis.rubies}.\n\n` +
				`__Multiplicateurs appliqués__ :\n` +
				`> Rang social : \`x${multipliers.role_rate.toFixed(2)}\`\n` +
				`> Série de **${multipliers.streak_days}** jour${multipliers.streak_days > 1 ? 's' : ''} : \`x${multipliers.streak_rate.toFixed(2)}\`\n`
		)
		.addFields({
			name: `${emojis.rubies} Solde actuel`,
			value: `\`${prevFmt}\` **→** \`${currentFmt}\` ${emojis.rubies}`,
			inline: false
		})
		.setFooter({
			text: 'Revenez demain !'
		});
}
