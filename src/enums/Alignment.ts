export enum Alignment {
	KILLER = 'killer',
	INFORMER = 'informer',
	LEADER = 'leader',
	PROTECTOR = 'protector',
	SUPPORT = 'support'
}

export function getAlignmentLabel(alignment: Alignment): string {
	const labels = {
		[Alignment.KILLER]: 'Tueur',
		[Alignment.INFORMER]: 'Informateur',
		[Alignment.LEADER]: 'Meneur',
		[Alignment.PROTECTOR]: 'Protecteur',
		[Alignment.SUPPORT]: 'Support'
	};
	return labels[alignment] || alignment;
}
