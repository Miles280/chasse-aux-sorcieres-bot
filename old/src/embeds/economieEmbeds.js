const { EmbedBuilder, GuildMember } = require("discord.js");

const emojis = require('../utils/emojis');

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
      .addFields({ name: "Contenu :", value: `> \`${gems}\` ${emojis.gems}`, inline: true }, { name: "\u200B", value: `> \`${rubies}\` ${emojis.rubies}`, inline: true })
      .addFields({
        name: "\nDernières transactions :",
        value: transactionsText || "Aucune transaction.",
      })
      .setColor("#360a5c")
      .setFooter({ text: "Essayez /boutique et /historique !" });
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

  /**
   * Génère un embed pour afficher l'historique des transactions d’un membre.
   * 
   * @param {GuildMember} member - Le membre concerné.
   * @param {Array} transactions - Liste des transactions.
   * @param {number} page - Numéro de page actuel.
   * @param {number} totalPages - Nombre total de pages.
   * @returns {EmbedBuilder}
   */
  historiqueEmbed: (member, transactions, page = 0, totalPages = 1) => {
    const formatTransaction = (tx) => {
      const timestamp = `<t:${Math.floor(new Date(tx.date).getTime() / 1000)}:R>`;
      const currency = tx.currency;
      const amount = tx.amount;
      const emoji = emojis[currency] || currency;

      let description;

      switch (tx.type) {
        case "add":
          description = `Ajout de +${amount} ${emoji}`;
          break;
        case "remove":
          description = `Retrait de -${amount} ${emoji}`;
          break;
        case "give":
          description = `Don de -${amount} ${emoji} à <@${tx.other_user_id}>`;
          break;
        case "receive":
          description = `Reçu de +${amount} ${emoji} de <@${tx.other_user_id}>`;
          break;
        case "buy":
          description = `Achat effectué de -${amount} ${emoji}`;
          break;
        case "casino":
          description = amount > 0 ?
            `Gains de +${amount} ${emoji} (casino)` :
            `Perte de -${Math.abs(amount)} ${emoji} (casino)`;
          break;
        default:
          description = "Type de transaction inconnu";
      }

      if (tx.description) {
        description += ` (${tx.description})`;
      }

      return `> ${timestamp} : ${description}`;
    };

    const formatted = transactions.map(formatTransaction).join("\n") || "Aucune transaction.";

    return new EmbedBuilder()
      .setAuthor({
        name: member.user.globalName || member.displayName,
        iconURL: member.user.displayAvatarURL({ dynamic: true }),
      })
      .setTitle(`__Historique de transaction de ${member.displayName}__`)
      .setColor("#360a5c")
      .setDescription(formatted)
      .setFooter({ text: `Page ${page + 1} / ${totalPages}` })
      .setTimestamp();
  },

};