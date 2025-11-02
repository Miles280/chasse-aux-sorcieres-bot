const { REST } = require('@discordjs/rest');
const { Routes } = require('discord.js');

module.exports = async bot => {
  const commands = [];

  // Ajout des commandes au registre
  bot.commands.forEach(command => {
    if (!command.data) {
      console.warn(`⚠️ La commande ${command.name} n'a pas de propriété "data".`);
      return;
    }

    commands.push(command.data.toJSON()); // SlashCommandBuilder → JSON
  });

  const rest = new REST({ version: '10' }).setToken(bot.token);

  try {
    await rest.put(
      Routes.applicationCommands(bot.user.id), { body: commands }
    );
    console.log('✅ Toutes les commandes slash ont été enregistrées avec succès.');
  } catch (error) {
    console.error('❌ Erreur lors de l’enregistrement des commandes slash :', error);
  }

  console.log("📦 Commandes enregistrées :", commands.map(c => c.name).join(", "));

};