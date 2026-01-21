import { EmbedBuilder, GuildMember } from 'discord.js';
import { emojis } from '../emojis';
import { formatTransactions } from '../formatTransactions';
import { formatTransactionLabel } from '../transactionLabels';
import { EconomyAction, EconomyEmbedOptions, TransactionHistory } from '../../models/Economy.interface';
import { colors } from '../customColors';

export function bourseEmbed(member: GuildMember, gems: number, rubies: number, transactionsText: string): EmbedBuilder {
	return new EmbedBuilder()
		.setAuthor({
			name: member.displayName,
			iconURL: member.user.displayAvatarURL()
		})
		.setTitle(`${emojis.purplecheck} __Bourse de ${member.displayName}__`)
		.addFields(
			{ name: 'Contenu :', value: `> \`${gems}\` ${emojis.gems}`, inline: true },
			{ name: '\u200B', value: `> \`${rubies}\` ${emojis.rubies}`, inline: true }
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
	const oldFmt = oldValue.toLocaleString();
	const newFmt = newValue.toLocaleString();

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
