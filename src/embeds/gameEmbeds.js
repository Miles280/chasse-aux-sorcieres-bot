const { EmbedBuilder } = require("discord.js");
const { win, loose } = require("../utils/customColors");

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
  towerEmbed: (mise, currentEtage, totalEtages, lignes, gains) => {
    return new EmbedBuilder()
      .setTitle("La tour piégée")
      .setDescription(
        `**Mise :** ${mise} 🔴\n` +
        `**Étage :** ${currentEtage}/${totalEtages}\n` +
        `**Gain actuel :** ${gains} 🔴\n\n` +
        lignes.join("\n")
      )
      .setColor("#9b59b6");
  },

  /**
   * Embed quand le joueur s'arrête et encaisse ses gains
   * @param {number} mise - Mise initiale
   * @param {number} currentEtage - Dernier étage franchi
   * @param {number} gains - Total de rubis gagnés
   * @param {string[]} lignes - Représentation finale de la tour
   * @returns {EmbedBuilder}
   */
  towerWinEmbed: (mise, currentEtage, gains, lignes) => {
    return new EmbedBuilder()
      .setTitle("🎉 Victoire !")
      .setDescription(
        `Tu as choisi de **t'arrêter** à l'étage ${currentEtage}.\n\n` +
        `**Mise de départ :** ${mise} 🔴\n` +
        `**Gains encaissés :** ${gains} 🔴\n\n` +
        `__Voici ta tour :__\n` +
        lignes.join("\n")
      )
      .setColor(win);
  },

  /**
   * Embed quand le joueur perd (tombe sur une bombe)
   * @param {number} mise - Mise initiale
   * @param {number} currentEtage - Étage atteint
   * @param {string[]} lignes - Représentation finale de la tour
   * @returns {EmbedBuilder}
   */
  towerLooseEmbed: (mise, currentEtage, lignes) => {
    return new EmbedBuilder()
      .setTitle("💥 BOUM !")
      .setDescription(
        `Tu es tombé sur une **bombe** à l'étage ${currentEtage} !\n\n` +
        `**Mise perdue :** ${mise} 🔴\n` +
        `**Étages franchis :** ${currentEtage - 1}\n\n` +
        `__Voici ta tour :__\n` +
        lignes.join("\n")
      )
      .setColor(loose);
  },

};