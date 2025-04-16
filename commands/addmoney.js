const { SlashCommandBuilder, PermissionFlagsBits } = require("discord.js");
const { errorEmbed, successEmbed, transactionEmbed, } = require("../utils/embeds");

module.exports = {
  name: "addmoney",
  description: "Ajoute une monnaie à un membre.",
  permission: PermissionFlagsBits.ManageMessages,
  dm: false,

  data: new SlashCommandBuilder()
    .setName("addmoney")
    .setDescription("Ajoute une monnaie à un membre.")
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages)
    .addStringOption((option) =>
      option
      .setName("monnaie")
      .setDescription("Type de monnaie")
      .setRequired(true)
      .addChoices({ name: "Gemme", value: "gems" }, { name: "Rubis", value: "rubies" })
    )
    .addUserOption((option) =>
      option
      .setName("membre")
      .setDescription("Membre impliqué")
      .setRequired(true)
    )
    .addNumberOption((option) =>
      option
      .setName("valeur")
      .setDescription("Valeur à ajouter")
      .setRequired(true)
    ),

  async execute(interaction, bot) {
    if (!interaction.member.permissions.has(this.permission)) {
      return interaction.reply({ embeds: [errorEmbed("Vous n'avez pas la permission d'utiliser cette commande.")], flags: 64 });
    }

    const usersQuery = require("../database/queries/users")(bot.db);
    const transactionsQuery = require("../database/queries/transactions")(bot.db);

    const monnaie = interaction.options.getString("monnaie");
    const valeur = interaction.options.getNumber("valeur");
    const targetUser = interaction.options.getUser("membre") || interaction.user;
    const member = await interaction.guild.members.fetch(targetUser.id);

    try {
      // Vérifie si le membre existe en DB
      const dbUser = await usersQuery.getUserByDiscordId(member.id);

      if (!dbUser) {
        // Ajoute un nouveau membre s'il n'existe pas
        await usersQuery.createUser(member.id);
        await usersQuery.updateCurrency(member.id, monnaie, valeur);

        // Enregistrer la transaction dans l'historique
        await transactionsQuery.addTransaction({
          user_id: member.id,
          type: "add",
          currency: monnaie,
          amount: valeur,
        });

        await interaction.reply({ embeds: [successEmbed(`${member} n'avait pas encore de compte. Un compte lui a été créé !`)], flags: 64 });

        await interaction.channel.send({ embeds: [transactionEmbed("add", valeur, monnaie, member)] });

        return;
      } else {
        // Mise à jour du champ correspondant
        await usersQuery.updateCurrency(member.id, monnaie, valeur);

        // Enregistrer la transaction dans l'historique
        await transactionsQuery.addTransaction({
          user_id: member.id,
          type: "add",
          currency: monnaie,
          amount: valeur,
        });

        return interaction.reply({ embeds: [transactionEmbed("add", valeur, monnaie, member)] });
      }
    } catch (err) {
      console.error("❌ Erreur MySQL dans /addmoney (vérifie que ton wamp soit allumé sale con) :", err);
      return interaction.reply({ embed: [errorEmbed("Une erreur est survenue lors de la transaction.")], flags: 64 });
    }
  }
};