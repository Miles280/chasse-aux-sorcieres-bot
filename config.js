require("dotenv").config({ path: ".env.local" }); // Charge les variables

module.exports = {
  token: process.env.DISCORD_TOKEN,
};
