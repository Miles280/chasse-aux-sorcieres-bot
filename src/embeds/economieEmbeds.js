const { EmbedBuilder, GuildMember } = require("discord.js");

const emojis = require('../utils/emojis');

module.exports = {
  bourseEmbed: (member, gems, rubies, transactionsText) => {
    return new EmbedBuilder()
      .setAuthor({
        name: member.user.globalName || member.displayName,
        iconURL: member.user.displayAvatarURL({ dynamic: true }),
      })
      .setTitle(`__Bourse de ${member.displayName}__`)
      .addFields(
        { name: "Contenu :", value: `> \`${gems}\` 💎`, inline: true },
        { name: "\u200B", value: `> \`${rubies}\` 🔴`, inline: true }
      )
      .addFields({
        name: "\nDernières transactions :",
        value: transactionsText || "Aucune transaction.",
      })
      .setColor("#360a5c")
      .setFooter({ text: "Essayez /boutique et /historique !" });
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
   * Embed pour un don réussi
   * @param {GuildMember} donneur - L'utilisateur qui donne
   * @param {User} cible - L'utilisateur qui reçoit
   * @param {string} currency - 'gems' ou 'rubies'
   * @param {number} amount - Montant transféré
   * @returns {EmbedBuilder}
   */
  donEmbed: (donneur, cible, currency, amount) => {
    return new EmbedBuilder()
      .setAuthor({
        name: donneur.user.globalName || donneur.displayName,
        iconURL: donneur.user.displayAvatarURL({ dynamic: true }),
      })
      .setTitle("La Chambre des Échanges")
      .setDescription(`${donneur} a donné ${amount} ${emojis[currency]} à ${cible}.`)
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
    balanceEmbed: (type, amount, currency, member) => {
      const transactionTypes = {
        add: `Ajout de +${amount} ${emojis[currency]}`,
        remove: `Retrait de -${amount} ${emojis[currency]}`,
      };
  
      const description = transactionTypes[type] || "Type de transaction inconnu";
  
      return new EmbedBuilder()
        .setTitle(`Les Coffres de Nistrium`)
        .setDescription(`${description} pour ${member}`)
        .setColor(type === "add" ? "#28a745" : "#dc3545")
        .setFooter({ text: "Transaction réalisée avec succès" });
    },
};
