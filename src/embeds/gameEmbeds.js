const { EmbedBuilder } = require("discord.js");

module.exports = {
  gameEmbed: (mise, currentEtage, totalEtages, lignes, gains) => {
    return new EmbedBuilder()
      .setTitle("💥 Jeu de l'étage piégé")
      .setDescription(
        `**Mise :** ${mise} 🔴\n` +
        `**Étage :** ${currentEtage}/${totalEtages}\n` +
        `**Gain actuel :** ${gains} 🔴\n\n` +
        lignes.reverse().join("\n")
      )
      .setColor("#9b59b6");
  },
};
