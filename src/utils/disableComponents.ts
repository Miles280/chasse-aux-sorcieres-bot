import { ActionRowBuilder } from 'discord.js';

/**
 * Désactive les components d'un message après un certain délai.
 * @param message - Le message à modifier
 * @param components - Les components à désactiver
 * @param delay - Le délai en minute avant la désactivation
 */
export function disableComponentsAfter(message: any, components: any, delay: number) {
	setTimeout(async () => {
		try {
			// On clone et désactive
			const disabled = components.map((row: any) => {
				if (row instanceof ActionRowBuilder) {
					row.components.forEach((comp: any) => {
						comp.setDisabled(true);
					});
				}
				return row;
			});

			// Mise à jour du message
			await message.edit({ components: disabled });
		} catch (e) {
			console.error('Erreur lors de la désactivation des components :', e);
		}
	}, 10_000 * delay);
}
