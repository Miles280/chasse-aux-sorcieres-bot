const { SlashCommandBuilder, PermissionFlagsBits } = require("discord.js");
const {
  errorEmbed,
  successEmbed,
  transactionEmbed,
} = require("../utils/embeds");

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
        .addChoices(
          { name: "Gemme", value: "gems" },
          { name: "Rubis", value: "rubies" }
        )
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
      return interaction.reply({
        embeds: [
          errorEmbed(
            "Vous n'avez pas la permission d'utiliser cette commande."
          ),
        ],
        flags: 64,
      });
    }

    const monnaie = interaction.options.getString("monnaie");
    const valeur = interaction.options.getNumber("valeur");
    const user = interaction.options.getUser("membre") || interaction.user;
    const membre = await interaction.guild.members.fetch(user.id);

    try {
      // Vérifie si le membre existe en DB
      const [rows] = await bot.db.query(
        "SELECT * FROM users WHERE discord_id = ?",
        [membre.id]
      );

      if (rows.length === 0) {
        // Ajoute un nouveau membre s'il n'existe pas
        await bot.db.query(
          "INSERT INTO users (discord_id, gems, rubies) VALUES (?, ?, ?)",
          [
            membre.id,
            monnaie === "gems" ? valeur : 0,
            monnaie === "rubies" ? valeur : 0,
          ]
        );

        // Enregistrer la transaction dans l'historique
        await bot.db.query(
          "INSERT INTO transactions (user_id, type, currency, amount) VALUES (?, ?, ?, ?)",
          [
            membre.id,
            "add", // Type de transaction
            monnaie,
            valeur,
          ]
        );

        await interaction.reply({
          embeds: [
            successEmbed(
              `${membre} n'avait pas encore de compte. Un compte lui a été créé !`
            ),
          ],
          flags: 64,
        });

        await interaction.followUp({
          embeds: [transactionEmbed("add", valeur, monnaie, membre)],
        });

        return;
      } else {
        // Mise à jour du champ correspondant
        await bot.db.query(
          `UPDATE users SET ${monnaie} = ${monnaie} + ? WHERE discord_id = ?`,
          [valeur, membre.id]
        );

        // Enregistrer la transaction dans l'historique
        await bot.db.query(
          "INSERT INTO transactions (user_id, type, currency, amount) VALUES (?, ?, ?, ?)",
          [
            membre.id,
            "add", // Type de transaction
            monnaie,
            valeur,
          ]
        );

        return interaction.reply({
          embeds: [transactionEmbed("add", valeur, monnaie, membre)],
        });
      }
    } catch (err) {
      console.error("❌ Erreur MySQL dans /addmoney :", err);
      return interaction.reply({
        embed: [errorEmbed("Une erreur est survenue lors de la transaction.")],
        flags: 64,
      });
    }
  },
};
