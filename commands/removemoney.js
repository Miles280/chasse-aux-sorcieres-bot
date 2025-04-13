const {
  SlashCommandBuilder,
  PermissionFlagsBits,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} = require("discord.js");
const {
  errorEmbed,
  successEmbed,
  transactionEmbed,
} = require("../utils/embeds");

module.exports = {
  name: "removemoney",
  description: "Retire une monnaie à un membre.",
  permission: PermissionFlagsBits.ManageMessages,
  dm: false,

  data: new SlashCommandBuilder()
    .setName("removemoney")
    .setDescription("Retire une monnaie à un membre.")
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
        .setDescription("Membre concerné")
        .setRequired(true)
    )
    .addNumberOption((option) =>
      option
        .setName("valeur")
        .setDescription("Montant à retirer")
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
    const membre = interaction.options.getUser("membre");

    try {
      const [rows] = await bot.db.query(
        "SELECT * FROM users WHERE discord_id = ?",
        [membre.id]
      );

      if (rows.length === 0) {
        return interaction.reply({
          embeds: [errorEmbed(`${membre} n'a pas encore de compte.`)],
          flags: 64,
        });
      }

      const current = rows[0][monnaie];

      if (current < valeur) {
        const row = new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId(`confirm_remove_${interaction.id}`)
            .setLabel(
              `Retirer ${current} ${monnaie === "gems" ? "gemmes" : "rubis"}`
            )
            .setStyle(ButtonStyle.Danger),
          new ButtonBuilder()
            .setCustomId(`cancel_remove_${interaction.id}`)
            .setLabel("Annuler")
            .setStyle(ButtonStyle.Secondary)
        );

        await interaction.reply({
          embeds: [
            errorEmbed(
              `${membre} n'a que **${current}** ${
                monnaie === "gems" ? "💎 gemmes" : "🔴 rubis"
              }.\nSouhaitez-vous retirer cette somme à la place ?`
            ),
          ],
          components: [row],
          flags: 64,
        });

        const collector = interaction.channel.createMessageComponentCollector({
          filter: (i) =>
            i.user.id === interaction.user.id &&
            (i.customId === `confirm_remove_${interaction.id}` ||
              i.customId === `cancel_remove_${interaction.id}`),
          time: 15000,
          max: 1,
        });

        collector.on("collect", async (i) => {
          if (i.customId === `confirm_remove_${interaction.id}`) {
            await bot.db.query(
              `UPDATE users SET ${monnaie} = 0 WHERE discord_id = ?`,
              [membre.id]
            );

            await bot.db.query(
              "INSERT INTO transactions (user_id, type, currency, amount) VALUES (?, ?, ?, ?)",
              [membre.id, "remove", monnaie, current]
            );

            await i.deferUpdate(); // Ne modifie pas le message initial (éphémère)
            await interaction.followUp({
              embeds: [transactionEmbed("remove", current, monnaie, membre)],
              ephemeral: false, // important pour que ce soit public
            });
          } else {
            await i.update({
              embeds: [successEmbed("Retrait annulé.")],
              components: [],
            });
          }
        });

        return;
      }

      // Retrait classique
      await bot.db.query(
        `UPDATE users SET ${monnaie} = ${monnaie} - ? WHERE discord_id = ?`,
        [valeur, membre.id]
      );

      await bot.db.query(
        "INSERT INTO transactions (user_id, type, currency, amount) VALUES (?, ?, ?, ?)",
        [membre.id, "remove", monnaie, valeur]
      );

      return interaction.reply({
        embeds: [transactionEmbed("remove", valeur, monnaie, membre)],
      });
    } catch (err) {
      console.error("❌ Erreur MySQL dans /removemoney :", err);
      return interaction.reply({
        embeds: [
          errorEmbed("Une erreur est survenue lors du retrait de monnaie."),
        ],
        flags: 64,
      });
    }
  },
};
