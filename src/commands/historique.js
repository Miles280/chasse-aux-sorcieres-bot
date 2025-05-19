const { SlashCommandBuilder, PermissionFlagsBits, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType } = require("discord.js");
const embeds = require("../embeds")

module.exports = {
  name: "historique",
  description: "Voir l'historique des transactions d'un membre.",
  permission: PermissionFlagsBits.ManageMessages,
  dm: false,

  data: new SlashCommandBuilder()
    .setName("historique")
    .setDescription("Voir l'historique des transactions d'un membre.")
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages)
    .addUserOption((option) =>
      option
      .setName("membre")
      .setDescription("Voir l'historique de ce membre.")
      .setRequired(false)
    ),

  async execute(interaction, bot) {
    if (!interaction.member.permissions.has(this.permission)) {
      return interaction.reply({ embeds: [embeds.errorEmbed("Vous n'avez pas la permission d'utiliser cette commande.")], flags: 64 });
    }

    const usersQuery = require("../database/queries/users")(bot.db);
    const transactionsQuery = require("../database/queries/transactions")(bot.db);

    const targetUser = interaction.options.getUser("membre") || interaction.user;
    const member = await interaction.guild.members.fetch(targetUser.id);

    try {
      const dbUser = await usersQuery.getUserByDiscordId(member.id);

      if (!dbUser) {
        return interaction.reply({
          embeds: [embeds.errorEmbed(`${member} n'a pas encore de compte enregistré.`)],
          flags: 64,
        });
      }

      const pageSize = 15;
      let page = 0;

      const allTransactions = await transactionsQuery.getTransactionsByUser(member.id);
      if (!allTransactions || allTransactions.length === 0) {
        return interaction.reply({
          embeds: [embeds.historiqueEmbed(member, "Aucune transaction.")],
        });
      }

      const getPageEmbed = (pageIndex) => {
        const start = pageIndex * pageSize;
        const end = start + pageSize;
        const transactions = allTransactions.slice(start, end);

        return embeds.historiqueEmbed(
          member,
          transactions,
          pageIndex,
          Math.ceil(allTransactions.length / pageSize)
        );
      };


      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
        .setCustomId("prev")
        .setLabel("◀️ Précédent")
        .setStyle(ButtonStyle.Primary)
        .setDisabled(true),
        new ButtonBuilder()
        .setCustomId("next")
        .setLabel("Suivant ▶️")
        .setStyle(ButtonStyle.Primary)
        .setDisabled(allTransactions.length <= pageSize)
      );

      await interaction.reply({
        embeds: [getPageEmbed(page)],
        components: [row],
      });

      const reply = await interaction.fetchReply();

      const collector = reply.createMessageComponentCollector({
        componentType: ComponentType.Button,
        time: 60000,
      });

      collector.on("collect", async(i) => {
        if (i.user.id !== interaction.user.id) {
          return i.reply({ content: "Ce menu ne vous est pas destiné.", ephemeral: true });
        }

        i.deferUpdate();
        if (i.customId === "next") page++;
        else if (i.customId === "prev") page--;

        const isFirstPage = page === 0;
        const isLastPage = (page + 1) * pageSize >= allTransactions.length;

        row.components[0].setDisabled(isFirstPage);
        row.components[1].setDisabled(isLastPage);

        await interaction.editReply({
          embeds: [getPageEmbed(page)],
          components: [row],
        });
      });

      collector.on("end", () => {
        row.components.forEach((btn) => btn.setDisabled(true));
        interaction.editReply({ components: [row] });
      });

    } catch (err) {
      console.error("❌ Erreur MySQL dans /historique :", err);
      return interaction.reply({
        embeds: [embeds.errorEmbed("❌ Une erreur est survenue lors de la récupération de l'historique.")],
        flags: 64,
      });
    }
  },
};