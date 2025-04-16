/**
 * Requêtes liées aux transactions.
 * @param {import("mysql2/promise").Connection} db - Instance de connexion à la base de données.
 */
module.exports = (db) => ({
    /**
     * Ajoute une transaction à la base de données.
     * 
     * @param {Object} data - Données de la transaction.
     * @param {string} data.user_id - ID du membre concerné.
     * @param {"add" | "remove" | "give" | "receive" | "buy" | "casino"} data.type - Type de la transaction.
     * @param {"gems" | "rubies"} data.currency - Monnaie concernée.
     * @param {number} data.amount - Montant de la transaction.
     * @param {string|null} [data.other_user_id] - ID d’un autre membre impliqué (optionnel).
     * @param {string|null} [data.description] - Description de la transaction (optionnelle).
     * 
     * @returns {Promise<void>}
     */
    addTransaction: async (data) => {
      const {
        user_id,
        type,
        currency,
        amount,
        other_user_id = null,
        description = null,
      } = data;
      await db.query(
        `
          INSERT INTO transactions (user_id, type, currency, amount, other_user_id, description)
          VALUES (?, ?, ?, ?, ?, ?)`,
        [user_id, type, currency, amount, other_user_id, description]
      );
    },
  
    /**
     * Récupère toutes les transactions d’un utilisateur.
     * 
     * @param {string} discordId - ID Discord du membre.
     * @returns {Promise<Object[]>} - Tableau d’objets représentant les transactions.
     */
    getTransactionsByUser: async (discordId) => {
      const [rows] = await db.query(
        "SELECT * FROM transactions WHERE user_id = ? ORDER BY date DESC",
        [discordId]
      );
      return rows;
    },
  
    /**
     * Récupère les dernières transactions d’un utilisateur, par défaut les 5 plus récentes.
     * 
     * @param {string} discordId - ID Discord du membre.
     * @param {number} [limit=5] - Nombre maximum de transactions à retourner.
     * @returns {Promise<Object[]|null>} - Tableau d’objets représentant les transactions.
     */
    getLastTransactionsByUser: async (discordId, limit = 5) => {
      const [rows] = await db.query(
        "SELECT * FROM transactions WHERE user_id = ? ORDER BY date DESC LIMIT ?",
        [discordId, limit]
      );
      return rows;
    },
  });
  