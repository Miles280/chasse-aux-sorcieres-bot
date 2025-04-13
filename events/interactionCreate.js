const Discord = require("discord.js")

module.exports = async (bot, interaction) => {
    if (interaction.type === Discord.InteractionType.ApplicationCommand) {
      try {
        let command = require(`../commands/${interaction.commandName}`);
        await command.execute(interaction, bot);
      } catch (err) {
        console.error(`Erreur dans la commande ${interaction.commandName} :`, err);
        interaction.reply({ content: "Une erreur est survenue en exécutant la commande.", ephemeral: true }).catch(() => {});
      }
    }
  }
  