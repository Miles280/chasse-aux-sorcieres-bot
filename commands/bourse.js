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
        return interaction.reply({ embeds: [errorEmbed("Vous n'avez pas la permission d'utiliser cette commande.")], flags: 64 });
      }

      const usersQuery = require("../database/queries/users")(bot.db);
      const transactionsQuery = require("../database/queries/transactions")(bot.db);

      const targetUser = interaction.options.getUser("membre") || interaction.user;
      const member = await interaction.guild.members.fetch(targetUser.id);

      try {
        const dbUser = await usersQuery.getUserByDiscordId(member.id);

        if (!dbUser) {
          await usersQuery.createUser(member.id);

          await interaction.reply({ embeds: [successEmbed(`${member} n'avait pas encore de compte. Un compte lui a été créé !`)], flags: 64 });

          await interaction.followUp({ embeds: [bourseEmbed(member, 0, 0, "Aucune transaction.")] });
        } else {
          const { gems, rubies } = dbUser;

          // Récupérer les 5 dernières transactions du membre
          const transactions = await transactionsQuery.getLastTransactionsByUser(member.id);

          const formatCurrency = (currency) => {
            if (currency === "gems") {
              return "💎";
            } else if (currency === "rubies") {
              return "🔴";
            }
            return currency; // Au cas où une autre monnaie serait ajoutée plus tard
          };

          let transactionDetails =
            transactions.length > 0 ?
            transactions.map((tx) => {
                const timestamp = `<t:${Math.floor(new Date(tx.date).getTime() / 1000)}:R>`;

                const transactionDescriptions = {
                    add: (tx) => `Ajout de +${tx.amount} ${formatCurrency(tx.currency)}`,
                    remove: (tx) => `Retrait de -${tx.amount} ${formatCurrency(tx.currency)}`,
                    give: (tx) => `Retrait de -${tx.amount} ${formatCurrency(tx.currency)} donné à <@${tx.other_user_id}>`,
                    receive: (tx) => `Réception de +${tx.amount} ${formatCurrency(tx.currency)} de <@${tx.other_user_id}>`,
                    buy: (tx) => `Achat effectué de -${tx.amount} ${formatCurrency(tx.currency)}`,
                    casino: (tx) => `Jeu de casino : ${tx.amount > 0? `Gains de +${tx.amount} ${formatCurrency(tx.currency)}`: `Perte de -${Math.abs(tx.amount)} ${formatCurrency(tx.currency)}`}`,
                };

                let description = transactionDescriptions[tx.type] ? transactionDescriptions[tx.type](tx) : "Type de transaction inconnu";

                if (tx.description) {description += ` (${tx.description})`;}

                 return `> ${timestamp} : ${description}`;
            }).join("\n") : "Aucune transaction.";

            return interaction.reply({embeds: [bourseEmbed(member, gems, rubies, transactionDetails)],});
        }
    } catch (err) {
      console.error("❌ Erreur MySQL dans /bourse (vérifie que ton wamp soit allumé sale con) :",err);
      return interaction.reply({embeds: [errorEmbed("❌ Une erreur est survenue lors de la récupération des informations."),],flags: 64});
    }
  }
};