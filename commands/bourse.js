const { SlashCommandBuilder, PermissionFlagsBits } = require("discord.js");
const { bourseEmbed, errorEmbed, successEmbed } = require("../utils/embeds");

module.exports = {
  name: "bourse",
  description: "Ouvrir la bourse d'un membre.",
  permission: PermissionFlagsBits.ManageMessages,
  dm: false,

  data: new SlashCommandBuilder()
    .setName("bourse")
    .setDescription("Ouvrir la bourse d'un membre.")
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages)
    .addUserOption((option) =>
      option
        .setName("membre")
        .setDescription("Observer la bourse de ce membre.")
        .setRequired(false)
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

    const user = interaction.options.getUser("membre") || interaction.user;
    const member = await interaction.guild.members.fetch(user.id);

    try {
      const [rows] = await bot.db.query(
        "SELECT * FROM users WHERE discord_id = ?",
        [member.id]
      );

      if (rows.length === 0) {
        await bot.db.query(
          "INSERT INTO users (discord_id, gems, rubies) VALUES (?, 0, 0)",
          [member.id]
        );
        await interaction.reply({
          embeds: [
            successEmbed(
              `${member} n'avait pas encore de compte. Un compte lui a été créé !`
            ),
          ],
          flags: 64,
        });

        await interaction.followUp({
          embeds: [bourseEmbed(member, 0, 0, "Aucune transaction.")],
        });
      } else {
        const { gems, rubies } = rows[0];
        // Récupérer les 5 dernières transactions du membre
        const [transactions] = await bot.db.query(
          "SELECT * FROM transactions WHERE user_id = ? ORDER BY date DESC LIMIT 5",
          [member.id]
        );

        const formatCurrency = (currency) => {
          if (currency === "gems") {
            return "💎";
          } else if (currency === "rubies") {
            return "🔴";
          }
          return currency; // Au cas où une autre monnaie serait ajoutée plus tard
        };

        let transactionDetails =
          transactions.length > 0
            ? transactions
                .map((tx) => {
                  // Format de la transaction : Discord timestamp + type de transaction
                  const timestamp = `<t:${Math.floor(
                    new Date(tx.date).getTime() / 1000
                  )}:R>`;

                  // Fonction pour générer la description de la transaction en fonction du type
                  const transactionDescriptions = {
                    add: (tx) =>
                      `Ajout de +${tx.amount} ${formatCurrency(tx.currency)}`,
                    remove: (tx) =>
                      `Retrait de -${tx.amount} ${formatCurrency(tx.currency)}`,
                    give: (tx) =>
                      `Retrait de -${tx.amount} ${formatCurrency(
                        tx.currency
                      )} donné à <@${tx.other_user_id}>`,
                    receive: (tx) =>
                      `Réception de +${tx.amount} ${formatCurrency(
                        tx.currency
                      )} de <@${tx.other_user_id}>`,
                    buy: (tx) =>
                      `Achat effectué de -${tx.amount} ${formatCurrency(
                        tx.currency
                      )}`,
                    casino: (tx) =>
                      `Jeu de casino : ${
                        tx.amount > 0
                          ? `Gains de +${tx.amount} ${formatCurrency(
                              tx.currency
                            )}`
                          : `Perte de -${Math.abs(tx.amount)} ${formatCurrency(
                              tx.currency
                            )}`
                      }`,
                  };

                  // Utilisation de l'objet pour générer la description
                  let description = transactionDescriptions[tx.type]
                    ? transactionDescriptions[tx.type](tx)
                    : "Type de transaction inconnu";

                  // Ajouter une description si elle existe
                  if (tx.description) {
                    description += ` (${tx.description})`;
                  }

                  return `> ${timestamp} : ${description}`;
                })
                .join("\n")
            : "Aucune transaction.";

        return interaction.reply({
          embeds: [bourseEmbed(member, gems, rubies, transactionDetails)],
        });
      }
    } catch (err) {
      console.error(
        "❌ Erreur lors de la récupération ou l'ajout des données :",
        err
      );
      return interaction.reply({
        embeds: [
          errorEmbed(
            "❌ Une erreur est survenue lors de la récupération des informations."
          ),
        ],
        flags: 64,
      });
    }
  },
};
