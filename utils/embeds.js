const { EmbedBuilder, GuildMember } = require("discord.js");

const formatCurrency = (currency) => {
  if (currency === "gems") {
    return "💎";
  } else if (currency === "rubies") {
    return "🔴";
  }
  return currency; // Au cas où une autre monnaie serait ajoutée plus tard
};

module.exports = {
  /**
   * Embed pour la commande /bourse
   * @param {GuildMember} member - Le membre dont on affiche la bourse (pas juste User)
   * @param {number} gems - Nombre de gemmes
   * @param {number} rubies - Nombre de rubis
   * @param {string} transactionsText - Historique des transactions formaté
   * @returns {EmbedBuilder}
   */
  bourseEmbed: (member, gems, rubies, transactionsText) => {
    return new EmbedBuilder()
      .setAuthor({
        name: member.user.globalName || member.displayName,
        iconURL: member.user.displayAvatarURL({ dynamic: true }),
      })
      .setTitle(`__Bourse de ${member.displayName}__`)
      .addFields({ name: "Contenu :", value: `> \`${gems}\` 💎`, inline: true }, { name: "\u200B", value: `> \`${rubies}\` 🔴`, inline: true })
      .addFields({
        name: "\nDernières transactions :",
        value: transactionsText || "Aucune transaction.",
      })
      .setColor("#360a5c")
      .setFooter({ text: "Essayez /boutique et /historique !" });
  },

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

  /**
   * Embed pour un don réussi
   * @param {GuildMember} donneur - L'utilisateur qui donne
   * @param {User} cible - L'utilisateur qui reçoit
   * @param {string} monnaie - 'gems' ou 'rubies'
   * @param {number} valeur - Montant transféré
   * @returns {EmbedBuilder}
   */
  donEmbed: (donneur, cible, monnaie, valeur) => {
    const emoji = monnaie === "gems" ? "💎" : "🔴";
    const label = monnaie === "gems" ? "gemmes" : "rubis";

    return new EmbedBuilder()
      .setAuthor({
        name: donneur.user.globalName || donneur.displayName,
        iconURL: donneur.user.displayAvatarURL({ dynamic: true }),
      })
      .setTitle("La Chambre des Échanges")
      .setDescription(`${donneur} a donné ${valeur} ${emoji} ${label} à ${cible}.`)
      .setColor("#360a5c");
  },

  /**
   * Crée un embed pour les ajouts ou retraits d'argent
   * @param {string} type - Le type de transaction ("add" ou "remove")
   * @param {number} amount - Le montant de la transaction
   * @param {string} currency - La monnaie utilisée ("gems" ou "rubies")
   * @param {GuildMember} member - L'utilisateur auquel l'argent est ajouté ou retiré
   * @returns {EmbedBuilder}
   */
  transactionEmbed: (type, amount, currency, member) => {
    const transactionTypes = {
      add: `Ajout de +${amount} ${formatCurrency(currency)}`,
      remove: `Retrait de -${amount} ${formatCurrency(currency)}`,
    };

    const description = transactionTypes[type] || "Type de transaction inconnu";

    return new EmbedBuilder()
      .setTitle(`La Chambre des Échanges`)
      .setDescription(`${description} pour ${member}`)
      .setColor(type === "add" ? "#28a745" : "#dc3545")
      .setFooter({ text: "Transaction réalisée avec succès" });
  },

  /**
   * Génère un embed pour afficher l'historique des transactions d’un membre.
   * 
   * @param {GuildMember} member - Le membre concerné.
   * @param {string} description - Le contenu formaté de l’historique.
   * @returns {EmbedBuilder}
   */
  historiqueEmbed: (member, description) => {
    return new EmbedBuilder()
      .setAuthor({
        name: member.user.globalName || member.displayName,
        iconURL: member.user.displayAvatarURL({ dynamic: true }),
      })
      .setTitle(`__Historique de transaction de ${member.displayName}__`)
      .setColor("#f39c12")
      .setDescription(description)
      .setTimestamp();
  },

  /**
   * Embed pour le jeu de l'étage piégé
   * @param {number} mise - Mise initiale
   * @param {number} currentEtage - Étage en cours
   * @param {number} totalEtages - Nombre total d'étages
   * @param {string[]} lignes - Représentation visuelle de la tour
   * @param {number} gains - Gains actuels
   * @returns {EmbedBuilder}
   */
  gameEmbed: (mise, currentEtage, totalEtages, lignes, gains) => {
    return new EmbedBuilder()
      .setTitle("💥 Jeu de l'étage piégé")
      .setDescription(
        `**Mise :** ${mise} 🔴\n` +
        `**Étage :** ${currentEtage}/${totalEtages}\n` +
        `**Gain actuel :** ${gains} 🔴\n\n` +
        lignes.reverse().join("\n") // Affiche du bas vers le haut
      )
      .setColor("#9b59b6");
  },

};