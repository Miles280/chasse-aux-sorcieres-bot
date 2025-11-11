const {
    SlashCommandBuilder,
    PermissionFlagsBits,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    UserContextMenuCommandBuilder,
    MessageContextMenuCommandBuilder
  } = require('discord.js');
  
  module.exports = {
    name: 'NOM_COMMANDE',
    description: 'DESCRIPTION_COMMANDE',
    permission: PermissionFlagsBits.ManageMessages, // Ajuster si nécessaire
    dm: false, // true si la commande peut être utilisée en MP
  
    data: new SlashCommandBuilder()
      .setName('NOM_COMMANDE')
      .setDescription('DESCRIPTION_COMMANDE')
      .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages) // Permissions par défaut
      .addStringOption(option =>
        option.setName('message')
          .setDescription('Message à envoyer')
          .setRequired(true)
      )
      .addNumberOption(option =>
        option.setName('nombre')
          .setDescription('Nombre de boutons')
          .setRequired(true)
      )
      // Exemples d'options plus avancées :
      // .addUserOption(option =>
      //   option.setName('utilisateur')
      //     .setDescription('Utilisateur à mentionner')
      //     .setRequired(false)
      // )
      // .addRoleOption(option =>
      //   option.setName('role')
      //     .setDescription('Rôle à mentionner')
      //     .setRequired(false)
      // )
      // Ajout d'options contextuelles pour les commandes de type `UserContextMenu` ou `MessageContextMenu`
      // .setType(UserContextMenuCommandBuilder) // Utilise ceci si la commande cible un utilisateur spécifique
      // .setType(MessageContextMenuCommandBuilder) // Utilise ceci si la commande cible un message
  
    ,
  
    // 🎯 Commande SLASH
    async execute(interaction, bot) {
      if (!interaction.member.permissions.has(this.permission)) {
        return interaction.reply({ content: '❌ Vous n\'avez pas la permission d\'utiliser cette commande.', ephemeral: true });
      }
  
      // Récupère les options de la commande
      const messageContent = interaction.options.getString('message');
      const number = interaction.options.getNumber('nombre');
  
      await handleLogic(interaction, messageContent, number);
    },
  
    // 🎯 Commande TEXTE (!commande)
    async run(message, args, bot) {
      if (!message.member.permissions.has(this.permission)) {
        return message.reply("❌ Tu n'as pas la permission d'utiliser cette commande.");
      }
  
      const messageContent = args.slice(0, -1).join(" ");
      const number = parseInt(args[args.length - 1]);
  
      if (!messageContent || isNaN(number)) {
        return message.reply("❌ Utilisation : `!commande <message> <nombre>`");
      }
  
      await handleLogic(message, messageContent, number);
    }
  };
  
  // 🧠 Fonction logique commune
  async function handleLogic(ctx, messageContent, number) {
    // Exemple de validation des données
    if (number < 1 || number > 5) {
      const replyContent = "❌ Tu peux créer entre 1 et 5 boutons seulement.";
      return isInteraction(ctx)
        ? ctx.reply({ content: replyContent, ephemeral: true })
        : ctx.reply(replyContent);
    }
  
    const row = new ActionRowBuilder();
    for (let i = 0; i < number; i++) {
      row.addComponents(
        new ButtonBuilder()
          .setCustomId(`bouton_${i + 1}`)
          .setLabel(`Bouton ${i + 1}`)
          .setStyle(ButtonStyle.Primary)
      );
    }
  
    if (isInteraction(ctx)) {
      await ctx.reply({ content: messageContent, components: [row] });
      return ctx.followUp({ content: "✅ Boutons envoyés !", ephemeral: true });
    } else {
      return ctx.channel.send({ content: messageContent, components: [row] });
    }
  }
  
  // 🔎 Détecte si ctx est une interaction (slash) ou un message
  function isInteraction(ctx) {
    return !!ctx.isChatInputCommand;
  }
  