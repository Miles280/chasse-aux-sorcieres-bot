/**
 * Requêtes liées aux utilisateurs.
 * @param {import("mysql2/promise").Connection} db - Instance de connexion à la base de données.
 */
module.exports = (db) => ({
  /**
   * Récupère un utilisateur via son identifiant Discord.
   * @param {string} discordId - L'identifiant Discord de l'utilisateur.
   * @returns {Promise<Object|null>} L'utilisateur ou null s'il n'existe pas.
   */
  getUserByDiscordId: async(discordId) => {
    const [rows] = await db.query("SELECT * FROM users WHERE discord_id = ?", [
      discordId,
    ]);
    return rows[0];
  },

  /**
   * Crée un nouvel utilisateur avec son identifiant Discord s'il n'existe pas déjà.
   * @param {string} discordId - L'identifiant Discord de l'utilisateur.
   * @returns {Promise<void>}
   */
  createUser: async(discordId) => {
    await db.query("INSERT IGNORE INTO users (discord_id) VALUES (?)", [
      discordId,
    ]);
  },

  /**
   * Met à jour la monnaie (gems ou rubies) d'un utilisateur.
   * @param {string} discordId - L'identifiant Discord de l'utilisateur.
   * @param {"gems"|"rubies"} currency - La monnaie à modifier.
   * @param {number} amount - Le montant à ajouter (ou soustraire si négatif).
   * @returns {Promise<void>}
   */
  updateCurrency: async(discordId, currency, amount) => {
    await db.query(
      `UPDATE users SET ${currency} = ${currency} + ? WHERE discord_id = ?`, [amount, discordId]
    );
  },

  /**
   * Récupère tous les utilisateurs de la base de données.
   * @returns {Promise<Array<Object>>} Liste des utilisateurs.
   */
  getAllUsers: async() => {
    const [rows] = await db.query("SELECT * FROM users");
    return rows;
  },
});