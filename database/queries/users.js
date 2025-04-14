module.exports = (db) => ({
  getUserByDiscordId: async (discordId) => {
    const [rows] = await db.query("SELECT * FROM users WHERE discord_id = ?", [
      discordId,
    ]);
    return rows[0];
  },

  createUser: async (discordId) => {
    await db.query("INSERT IGNORE INTO users (discord_id) VALUES (?)", [
      discordId,
    ]);
  },

  updateCurrency: async (discordId, currency, amount) => {
    await db.query(
      `UPDATE users SET ${currency} = ${currency} + ? WHERE discord_id = ?`,
      [amount, discordId]
    );
  },

  getAllUsers: async () => {
    const [rows] = await db.query("SELECT * FROM users");
    return rows;
  },
});
