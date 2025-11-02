const Discord = require("discord.js");
const intents = new Discord.IntentsBitField(3276799);
const bot = new Discord.Client({ intents });
const loadCommands = require("./src/loader/loadCommands");
const loadEvents = require("./src/loader/loadEvents");
const config = require("./config");

bot.commands = new Discord.Collection();

bot.login(config.token);
loadCommands(bot);
loadEvents(bot);