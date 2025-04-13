const Discord = require("discord.js");
const db = require("../database/connect");
const loadSlashCommand = require("../loader/loadSlashCommands");

module.exports = async (bot) => {
  // Charge la base de données
  bot.db = db;
  console.log("Base de données connectée !");

  // Charge les commandes Slash
  await loadSlashCommand(bot);

  console.log(`${bot.user.tag} est bien connecté!`);
};
