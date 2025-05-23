const { EmbedBuilder } = require("discord.js");

module.exports = {
  /**
   * Embed pour le jeu de l'étage piégé
   * @param {number} mise - Mise initiale
   * @param {number} currentEtage - Étage en cours
   * @param {number} totalEtages - Nombre total d'étages
   * @param {string[]} lignes - Représentation visuelle de la tour
   * @param {number} gains - Gains actuels
   * @returns {EmbedBuilder}
   */
  tourEmbed: (mise, currentEtage, totalEtages, lignes, gains) => {
    return new EmbedBuilder()
      .setTitle("💥 Jeu de l'étage piégé")
      .setDescription(
        `**Mise :** ${mise} 🔴\n` +
        `**Étage :** ${currentEtage}/${totalEtages}\n` +
        `**Gain actuel :** ${gains} 🔴\n\n` +
        lignes.join("\n")
      )
      .setColor("#9b59b6");
  },
};