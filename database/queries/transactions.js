module.exports = (db) => ({
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

  getTransactionsByUser: async (discordId) => {
    const [rows] = await db.query(
      "SELECT * FROM transactions WHERE user_id = ? ORDER BY date DESC",
      [discordId]
    );
    return rows;
  },

  getLastTransactionsByUser: async (discordId, limit = 5) => {
    const [rows] = await db.query(
      "SELECT * FROM transactions WHERE user_id = ? ORDER BY date DESC LIMIT ?",
      [discordId, limit]
    );
    return rows;
  },
});
