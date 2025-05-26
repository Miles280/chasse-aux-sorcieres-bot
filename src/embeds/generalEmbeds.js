const { EmbedBuilder } = require("discord.js");

module.exports = {
  /**
   * Embed d'erreur générique
   * @param {string} message - Message d'erreur à afficher
   * @returns {EmbedBuilder}
   */
  errorEmbed: (message) => {
    return new EmbedBuilder()
      .setTitle("❌ Erreur")
      .setDescription(message)
      .setColor("#E74C3C");
  },

  /**
   * Embed de succès générique
   * @param {string} message - Message de confirmation
   * @returns {EmbedBuilder}
   */
  successEmbed: (message) => {
    return new EmbedBuilder()
      .setTitle("✅ Succès")
      .setDescription(message)
      .setColor("#2ECC71");
  },
};