import { EmbedBuilder, GuildMember } from 'discord.js';
import { emojis } from '../emojis';
import { formatTransactions } from '../formatTransactions';

interface BourseEmbedParams {
	member: GuildMember;
	gems: number;
	rubies: number;
	transactionsText?: string;
}

export function bourseEmbed({ member, gems, rubies, transactionsText }: BourseEmbedParams): EmbedBuilder {
	return new EmbedBuilder()
		.setAuthor({
			name: member.displayName,
			iconURL: member.user.displayAvatarURL()
		})
		.setTitle(`__Bourse de ${member.displayName}__`)
		.addFields(
			{ name: 'Contenu :', value: `> \`${gems}\` ${emojis.gems}`, inline: true },
			{ name: '\u200B', value: `> \`${rubies}\` ${emojis.rubies}`, inline: true }
		)
		.addFields({
			name: '\nDernières transactions :',
			value: transactionsText || 'Aucune transaction.'
		})
		.setColor('#360a5c')
		.setFooter({ text: 'Essayez /boutique et /historique !' });
}

type Balance = {
	gems: number;
	rubies: number;
};

type EconomyEmbedOptions = {
	member: GuildMember;
	action: 'add' | 'remove' | 'set' | 'give';
	targetId: string;
	currency: 'gems' | 'rubies';
	amount: number;
	old: number;
	balance: Balance;
};

const ACTIONS = {
	add: {
		color: 0x3bd16f,
		title: `${emojis.greencheck} Ajout effectué`,
		format: (targetId: string, amount: number, emoji: string) => `Vous avez ajouté **+${amount} ${emoji}** à <@${targetId}>.`
	},
	remove: {
		color: 0xff4d4d,
		title: `${emojis.redcheck} Retrait effectué`,
		format: (targetId: string, amount: number, emoji: string) => `Vous avez retiré **-${amount} ${emoji}** à <@${targetId}>.`
	},
	set: {
		color: 0x3b82f6,
		title: `${emojis.bluecheck} Mise à jour effectuée`,
		format: (targetId: string, amount: number, emoji: string) => `Le solde de <@${targetId}> a été défini à **${amount} ${emoji}**.`
	},
	give: {
		color: 0xff6d2d,
		title: `${emojis.orangecheck} Don effectué`,
		format: (targetId: string, amount: number, emoji: string) => `Vous avez donné **${amount} ${emoji}** à <@${targetId}>.`
	}
};

export function economyActionEmbed(opts: EconomyEmbedOptions) {
	const emoji = opts.currency === 'gems' ? emojis.gems : emojis.rubies;
	const action = ACTIONS[opts.action];

	const { gems, rubies } = opts.balance;

	// Valeurs avant/après pour la monnaie ciblée
	const oldBalance = opts.old || 0;
	const newBalance = opts.currency === 'gems' ? gems : rubies;

	// Détermine le label (Gems / Rubies)
	const currencyLabel = opts.currency === 'gems' ? 'Gemmes' : 'Rubis';

	// Field unique uniquement pour la monnaie modifiée
	const fields = [
		{
			name: `${currencyLabel} modifié${opts.currency === 'gems' ? 'es' : 's'} :`,
			value: `> \`${oldBalance}\` ${emoji} → \`${newBalance}\` ${emoji}`,
			inline: true
		}
	];

	return new EmbedBuilder()
		.setColor(action.color)
		.setTitle(action.title)
		.setDescription(action.format(opts.targetId, opts.amount, emoji))
		.addFields(fields);
}

export function buildHistoryEmbed(member: GuildMember, data: { transactions: any[]; page: number; pages: number }): EmbedBuilder {
	return new EmbedBuilder()
		.setAuthor({
			name: member.displayName,
			iconURL: member.user.displayAvatarURL()
		})
		.setTitle(`__Historique des transactions de ${member.displayName}__`)
		.setDescription(formatTransactions(data.transactions))
		.setFooter({ text: `Page ${data.page}/${data.pages}` })
		.setColor(0x360a5c)
		.setTimestamp();
}
