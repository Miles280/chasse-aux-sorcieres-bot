const { SlashCommandBuilder, PermissionFlagsBits } = require("discord.js");
const { donEmbed, errorEmbed, successEmbed } = require("../utils/embeds");

module.exports = {
  name: "givemoney",
  description: "Donne une monnaie à un membre depuis votre propre compte.",
  permission: null,
  dm: false,

  data: new SlashCommandBuilder()
    .setName("givemoney")
    .setDescription("Donne une monnaie à un membre depuis votre propre compte.")
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
        .setDescription("Le membre à qui vous voulez donner")
        .setRequired(true)
    )
    .addNumberOption((option) =>
      option
        .setName("valeur")
        .setDescription("Montant à donner")
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

    const usersQuery = require("../database/queries/users")(bot.db);
    const transactionsQuery = require("../database/queries/transactions")(bot.db);
    const monnaie = interaction.options.getString("monnaie");
    const cible = interaction.options.getUser("membre");
    const valeur = interaction.options.getNumber("valeur");
    const user = interaction.user;
    const donneur = await interaction.guild.members.fetch(user.id);

    if (cible.id === donneur.id) {
      return interaction.reply({
        embeds: [errorEmbed("Tu es con ouuuu ?")],
        flags: 64,
      });
    }

    try {
      // Vérifie si le membre existe en DB
      const donneurData = await usersQuery.getUserByDiscordId(donneur.id);

      if (!donneurData) {
        return interaction.reply({
          embeds: [errorEmbed("Et si tu essayais de faire `/bourse` déjà ?")],
          flags: 64,
        });
      }

      const soldeActuel = donneurData[monnaie];

      if (soldeActuel < valeur) {
        const difference = valeur - soldeActuel;
        const nomMonnaie = monnaie === "gems" ? "gemmes" : "rubis";
        const phraseErreur = `Vous ne pouvez pas effectez cette action, il vous manque ${difference} ${nomMonnaie}.`;

        return interaction.reply({
          embeds: [errorEmbed(phraseErreur)],
          flags: 64,
        });
      }

      // Si l'utilisateur essaie de donner des rubis, vérifier s'il peut
      if (monnaie === "rubies") {
        // Vérifie la dernière transaction de type 'give' avec rubis
        const [transaction] = await transactionsQuery.getLastTransactionsByUser(member.id, 1);

        if (transaction) {
          const timeDifference = Date.now() - new Date(transaction.date);

          // Si la différence est inférieure à 48 heures (48h * 60min * 60sec * 1000ms)
          const FORTY_EIGHT_HOURS_MS = 48 * 60 * 60 * 1000;

          if (timeDifference < FORTY_EIGHT_HOURS_MS) {
            const remainingTime = FORTY_EIGHT_HOURS_MS - timeDifference;
            const futureTimestamp = Math.floor((Date.now() + remainingTime) / 1000); // Unix timestamp

            return interaction.reply({
              embeds: [
                errorEmbed(
                  `⏳ Vous avez déjà donné des rubis récemment.\n` +
                  `Vous pourrez donner de nouveau des Rubis dans <t:${futureTimestamp}:R> (à <t:${futureTimestamp}:t>).`
                )
              ],
              flags: 64,
            });
          }
        }
      }

      // Vérifie si le receveur a un compte
      const cibleData = await usersQuery.getUserByDiscordId(cible.id);

      if (!cibleData) {
        // Création d’un compte pour le receveur
        await usersQuery.createUser(cible.id);
      }

      // Mise à jour du solde du receveur
      await usersQuery.updateCurrency(donneur.id, monnaie, -valeur);

      // Mise à jour du solde du receveur
      await usersQuery.updateCurrency(cible.id, monnaie, valeur);

      // Enregistrer la transaction dans l'historique (donneur -> receveur)
      await transactionsQuery.addTransaction({
        user_id: cible.id,
        type: "receive",
        currency: monnaie,
        amount: valeur,
        other_user_id: donneur.id,
      });

      // Enregistrer la transaction dans l'historique (donneur -> receveur)
      await transactionsQuery.addTransaction({
        user_id: donneur.id,
        type: "give",
        currency: monnaie,
        amount: valeur,
        other_user_id: donneur.id,
      });      

      return interaction.reply({
        embeds: [donEmbed(donneur, cible, monnaie, valeur)],
      });
    } catch (err) {
      console.error("❌ Erreur MySQL dans /givemoney :", err);
      return interaction.reply({
        embed: [errorEmbed("Une erreur est survenue lors de la transaction.")],
        flags: 64,
      });
    }
  },
};
