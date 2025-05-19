const { EmbedBuilder } = require("discord.js");

module.exports = {
  errorEmbed: (message) => {
    return new EmbedBuilder()
      .setTitle("❌ Erreur")
      .setDescription(message)
      .setColor("#E74C3C");
  },

  successEmbed: (message) => {
    return new EmbedBuilder()
      .setTitle("✅ Succès")
      .setDescription(message)
      .setColor("#2ECC71");
  },
};
