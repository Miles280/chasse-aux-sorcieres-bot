const {
  SlashCommandBuilder,
  PermissionFlagsBits,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle
} = require('discord.js');

module.exports = {
  name: 'clear',
  description: 'Supprime un certain nombre de messages.',
  permission: PermissionFlagsBits.ManageMessages, 
  dm: false, 

  data: new SlashCommandBuilder()
    .setName('clear')
    .setDescription('Supprime un certain nombre de messages.')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages) 
    .addNumberOption(option =>
      option.setName('nombre')
        .setDescription('Nombre de messages à supprimer')
        .setRequired(true)
    ),

  // 🎯 Commande SLASH
  async execute(interaction) {
    if (!interaction.member.permissions.has(this.permission)) {
      return interaction.reply({ content: '❌ Vous n\'avez pas la permission d\'utiliser cette commande.', flags: 64 });
    }

    const number = interaction.options.getNumber('nombre');
    await handleLogic(interaction, number);
  },

  // 🎯 Commande TEXTE (!commande)
  async run(message, args) {
    if (!message.member.permissions.has(this.permission)) {
      return message.reply("❌ Tu n'as pas la permission d'utiliser cette commande.");
    }

    const number = parseInt(args[args.length - 1]);
    if (isNaN(number)) {
      return message.reply("❌ Utilisation : `.clear <valeur>`");
    }

    await handleLogic(message, number);
  }
};

// 🧠 Fonction logique commune
async function handleLogic(ctx, number) {
  // Exemple de validation des données
  if (number < 1 || number > 100) {
    const replyContent = "❌ Tu peux supprimer entre 1 et 100 messages.";
    return isInteraction(ctx)
      ? ctx.reply({ content: replyContent, flags: 64 })
      : ctx.reply(replyContent);
  }

  // Détection du type de commande (interaction ou message)
  const channel = isInteraction(ctx) ? ctx.channel : ctx.guild.channels.cache.get(ctx.channel.id);

  try {
    const deleted = await channel.bulkDelete(number, true);
    let content = `🧹 J'ai supprimé \`${deleted.size}\` message(s).`;
    
    if (!isInteraction(ctx)) {
      await ctx.channel.send({ content });
    } else {
      await ctx.reply({ content, flags: 64 });
    }
  } catch (err) {
    console.error(err);
    const fetched = await channel.messages.fetch();
    const messages = fetched.filter(m => (Date.now() - m.createdTimestamp) < 14 * 24 * 60 * 60 * 1000);

    if (messages.size === 0) {
      const noMessagesContent = "❌ Aucun message à supprimer (ils datent tous de plus de 14 jours).";
      if (!isInteraction(ctx)) {
        await ctx.channel.send({ content: noMessagesContent });
      } else {
        await ctx.reply({ content: noMessagesContent, flags: 64 });
      }
      return;
    }

    await channel.bulkDelete(messages, true);
    const content = `🧹 J'ai supprimé \`${messages.size}\` message(s) (les autres dataient de plus de 14 jours).`;

    if (!isInteraction(ctx)) {
      await ctx.channel.send({ content });
    } else {
      await ctx.reply({ content, flags: 64 });
    }
  }
}

// 🔎 Détecte si ctx est une interaction (slash) ou un message
function isInteraction(ctx) {
  return !!ctx.isChatInputCommand;
}
