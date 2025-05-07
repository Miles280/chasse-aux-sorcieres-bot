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
        embeds: [errorEmbed("Vous n'avez pas la permission d'utiliser cette commande.")],
        flags: 64,
      });
    }

    const usersQuery = require("../database/queries/users")(bot.db);
    const transactionsQuery = require("../database/queries/transactions")(bot.db);

    const currency = interaction.options.getString("monnaie");
    const amount = interaction.options.getNumber("valeur");
    const member = interaction.options.getUser("membre");

    try {
      const dbUser = await usersQuery.getUserByDiscordId(member.id);

      if (!dbUser) {
        return interaction.reply({
          embeds: [errorEmbed(`${member} n'a pas encore de compte.`)],
          flags: 64,
        });
      }

      const current = dbUser[currency];

      if (current === 0) {
        return interaction.reply({
          embeds: [
            errorEmbed(`${member} n'a pas de ${currency === "gems" ? "💎 gemmes" : "🔴 rubis"}.`)
          ],
          flags: 64,
        });
      }

      // 💬 Si le montant demandé est supérieur à ce que le joueur possède, proposer une confirmation
      if (current < amount) {
        const row = new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId(`confirm_remove_${interaction.id}`)
            .setLabel(`Retirer ${current} ${currency === "gems" ? "gemmes" : "rubis"}`)
            .setStyle(ButtonStyle.Danger),
          new ButtonBuilder()
            .setCustomId(`cancel_remove_${interaction.id}`)
            .setLabel("Annuler")
            .setStyle(ButtonStyle.Secondary)
        );

        await interaction.reply({
          embeds: [
            errorEmbed(
              `${member} n'a que **${current}** ${currency === "gems" ? "💎 gemmes" : "🔴 rubis"}.\nSouhaitez-vous retirer cette somme à la place ?`
            )
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
            await usersQuery.updateCurrency(member.id, currency, -current);

            await transactionsQuery.addTransaction({
              user_id: member.id,
              type: "remove",
              currency,
              amount: current,
            });

            await i.update({
              embeds: [successEmbed("Retrait effectué.")],
              components: [],
            });

            await interaction.channel.send({
              embeds: [transactionEmbed("remove", current, currency, member)],
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
      console.log(`[DEBUG] updateCurrency: ${currency} = ${currency} + ${amount}`);

      // ✅ Retrait classique
      await usersQuery.updateCurrency(member.id, currency, -amount);

      await transactionsQuery.addTransaction({
        user_id: member.id,
        type: "remove",
        currency,
        amount,
      });

      return interaction.reply({
        embeds: [transactionEmbed("remove", amount, currency, member)],
      });
    } catch (err) {
      console.error("❌ Erreur MySQL dans /removemoney :", err);
      return interaction.reply({
        embeds: [errorEmbed("Une erreur est survenue lors du /removemoney.")],
        flags: 64,
      });
    }
  },
};
