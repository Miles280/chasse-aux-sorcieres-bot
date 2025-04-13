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
      // Vérifie si le donneur a un compte
      const [donneurRows] = await bot.db.query(
        "SELECT * FROM users WHERE discord_id = ?",
        [donneur.id]
      );
      if (donneurRows.length === 0) {
        return interaction.reply({
          embeds: [errorEmbed("Et si tu essayais de faire `/bourse` déjà ?")],
          flags: 64,
        });
      }

      const donneurData = donneurRows[0];
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
        const [transactions] = await bot.db.query(
          'SELECT * FROM transactions WHERE user_id = ? AND currency = ? AND type = "give" ORDER BY date DESC LIMIT 1',
          [donneur.id, "rubies"]
        );

        if (transactions.length > 0) {
          const lastTransaction = transactions[0];
          const lastTransactionDate = new Date(lastTransaction.date);
          const currentDate = new Date();
          const timeDifference = currentDate - lastTransactionDate;

          // Si la différence est inférieure à 48 heures (48h * 60min * 60sec * 1000ms)
          if (timeDifference < 48 * 60 * 60 * 1000) {
            const remainingTime = 48 * 60 * 60 * 1000 - timeDifference;
            const futureTimestamp = Math.floor(
              (Date.now() + remainingTime) / 1000
            ); // En secondes

            const embedContent = errorEmbed(
              `⏳ Vous avez déjà donné des rubis récemment.\n
              Vous pourrez redonner <t:${futureTimestamp}:R> (à <t:${futureTimestamp}:t>).`
            );

            return interaction.reply({
              embeds: [embedContent],
              flags: 64,
            });
          }
        }
      }

      // Vérifie si le receveur a un compte
      const [cibleRows] = await bot.db.query(
        "SELECT * FROM users WHERE discord_id = ?",
        [cible.id]
      );
      if (cibleRows.length === 0) {
        // Création d’un compte pour le receveur
        await bot.db.query(
          "INSERT INTO users (discord_id, gems, rubies) VALUES (?, ?, ?)",
          [
            cible.id,
            monnaie === "gems" ? valeur : 0,
            monnaie === "rubies" ? valeur : 0,
          ]
        );

        // Enregistrer la transaction dans l'historique (donneur -> receveur)
        await bot.db.query(
          "INSERT INTO transactions (user_id, type, currency, amount, other_user_id) VALUES (?, ?, ?, ?, ?)",
          [
            donneur.id,
            "give", // Type de transaction
            monnaie,
            valeur,
            cible.id,
          ]
        );

        // Enregistrer la transaction dans l'historique (receveur -> donneur)
        await bot.db.query(
          "INSERT INTO transactions (user_id, type, currency, amount, other_user_id) VALUES (?, ?, ?, ?, ?)",
          [
            cible.id,
            "receive", // Type de transaction
            monnaie,
            valeur,
            donneur.id,
          ]
        );
      } else {
        // Mise à jour du solde du receveur
        await bot.db.query(
          `UPDATE users SET ${monnaie} = ${monnaie} + ? WHERE discord_id = ?`,
          [valeur, cible.id]
        );

        // Enregistrer la transaction dans l'historique (donneur -> receveur)
        await bot.db.query(
          "INSERT INTO transactions (user_id, type, currency, amount, other_user_id) VALUES (?, ?, ?, ?, ?)",
          [
            donneur.id,
            "give", // Type de transaction
            monnaie,
            valeur,
            cible.id,
          ]
        );

        // Enregistrer la transaction dans l'historique (receveur -> donneur)
        await bot.db.query(
          "INSERT INTO transactions (user_id, type, currency, amount, other_user_id) VALUES (?, ?, ?, ?, ?)",
          [
            cible.id,
            "receive", // Type de transaction
            monnaie,
            valeur,
            donneur.id,
          ]
        );
      }

      // Retire l’argent du donneur
      await bot.db.query(
        `UPDATE users SET ${monnaie} = ${monnaie} - ? WHERE discord_id = ?`,
        [valeur, donneur.id]
      );

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
