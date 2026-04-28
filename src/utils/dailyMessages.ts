export const DAILY_MESSAGES = {
	critical_failure: [
		'Une journée peu fructueuse pour vos activités.',
		'Votre bourse semble plus légère que prévu ce matin.',
		"La récolte a été particulièrement maigre aujourd'hui.",
		'Quelques imprévus au village ont réduit vos gains.',
		'Les ressources manquent, votre part est limitée.'
	],
	common: [
		'Quelques rubis glanés après avoir aidé à la forge ce matin.',
		'Votre part suite à la vente des récoltes sur la place du village.',
		"Le tavernier vous a laissé un petit pécule pour l'aide d'hier soir.",
		'Le fruit de votre labeur quotidien sous le ciel gris du village.',
		'Une bourse modeste pour avoir surveillé les abords de la forêt.',
		'Votre paie pour avoir aidé le vieux clerc à trier ses parchemins.',
		'Quelques pièces récupérées en rangeant les étals du marché.',
		'Le prix de votre sueur après une journée aux champs.',
		'Une rétribution honnête pour avoir réparé les barrières du village.',
		'Votre salaire pour avoir veillé sur les réserves de grain cette nuit.',
		'Un petit supplément pour avoir escorté les marchands au lever du jour.',
		'Quelques rubis trouvés au fond de votre besace de travail.'
	],
	jackpot: [
		'Une prime exceptionnelle pour votre dévouement.',
		'Vous avez retrouvé un ancien pécule oublié.',
		'Récompense très généreuse du conseil du village.',
		'Les stocks sont au plus haut, vous en profitez !',
		"Une prime inattendue vient s'ajouter à votre solde."
	]
};

/**
 * Récupère un message aléatoire selon le type de résultat
 */
export function getRandomDailyMessage(type: 'critical_failure' | 'common' | 'jackpot'): string {
	const messages = DAILY_MESSAGES[type];
	return messages[Math.floor(Math.random() * messages.length)];
}
