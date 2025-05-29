const { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType } = require("discord.js");
const embeds = require("../embeds");

module.exports = {
  name: "tower",
  description: "Jouer au jeu de la tour piégé !",
  dm: false,

  data: new SlashCommandBuilder()
    .setName("tower")
    .setDescription("Grimpez la tour en évitant la bombe pour gagner le plus de rubis possible.")
    .addIntegerOption(option =>
      option.setName("mise")
      .setDescription("Le montant que vous misez en rubis")
      .setRequired(true)
    ),

  async execute(interaction, bot) {
    const betAmount = interaction.options.getInteger("mise");
    const playerId = interaction.user.id;

    const usersQuery = require("../database/queries/users")(bot.db);
    const transactionsQuery = require("../database/queries/transactions")(bot.db);

    const user = await usersQuery.getUserByDiscordId(playerId)

    if (!user) {
      return interaction.reply({ embeds: [embeds.errorEmbed("Vous n'avez pas encore de compte !")], flags: 64 });
    } else if (betAmount <= 0) {
      return interaction.reply({ embeds: [embeds.errorEmbed("La mise doit être supérieure à 0.")], flags: 64 });
    } else if (user.rubies < betAmount) {
      return interaction.reply({ embeds: [embeds.errorEmbed("Vous n’avez pas assez de rubis pour miser cette somme.")], flags: 64 });
    }

    // 🔁 Initialisation
    const totalFloors = 10;
    let currentFloor = 0;
    let gameOver = false;
    let totalGains = 0;

    const floorDisplay = Array.from({ length: totalFloors }, () => ["⬛", "⬛", "⬛"]);
    const bombs = Array.from({ length: totalFloors }, () => Math.floor(Math.random() * 3));

    // ✅ Gain arrondi à l'entier supérieur
    const calculeGain = (floor) => Math.ceil(betAmount * (1 + 0.1 * floor ** 2));

    const renderLignes = () => floorDisplay
      .map((ligne, i) => `Étage ${i + 1} : ${ligne.join(" ")}`)
      .reverse();

    // ✅ Générateur de boutons selon étage
    const createButtons = (withStop = false) => {
      const row = new ActionRowBuilder();
      for (let i = 0; i < 3; i++) {
        row.addComponents(
          new ButtonBuilder()
          .setCustomId(`choix_${i}`)
          .setLabel("⬛")
          .setStyle(ButtonStyle.Secondary)
        );
      }

      if (withStop) {
        row.addComponents(
          new ButtonBuilder()
          .setCustomId("stop")
          .setLabel("💰 S'arrêter ici")
          .setStyle(ButtonStyle.Success)
        );
      }

      return [row];
    };

    // 🎮 Premier affichage sans bouton stop
    const gameMessage = await interaction.reply({
      embeds: [embeds.towerEmbed(betAmount, currentFloor, totalFloors, renderLignes(), totalGains)],
      components: createButtons(false)
    });

    const collector = gameMessage.createMessageComponentCollector({
      componentType: ComponentType.Button,
      time: 120000,
    });

    collector.on("collect", async btn => {
      if (btn.user.id !== playerId) {
        return btn.reply({ embeds: [embeds.errorEmbed("Ce jeu n'est pas le vôtre !")], flags: 64 });
      }

      if (gameOver) return;

      if (btn.customId === "stop") {
        // Révéler tous les étages restants
        for (let i = currentFloor; i < totalFloors; i++) {
          const bomb = bombs[i];
          floorDisplay[i] = floorDisplay[i].map((_, j) => j === bomb ? "💣" : "🟩");
        }

        gameOver = true;

        const gainFinal = totalGains - betAmount;
        await transactionsQuery.addTransaction({
          user_id: playerId,
          type: "casino",
          currency: "rubies",
          amount: gainFinal
        });
        await usersQuery.updateCurrency(playerId, "rubies", gainFinal);

        return btn.update({
          embeds: [embeds.towerWinEmbed(betAmount, currentFloor, totalGains, renderLignes())],
          components: []
        });
      }

      const choix = parseInt(btn.customId.split("_")[1]);
      const bomb = bombs[currentFloor];

      floorDisplay[currentFloor] = floorDisplay[currentFloor].map((_, i) => i === bomb ? "💣" : "🟩");

      if (choix === bomb) {
        floorDisplay[currentFloor] = floorDisplay[currentFloor].map((_, i) => i === bomb ? "💥" : "🟩");

        // Révéler les étages restants
        for (let i = currentFloor + 1; i < totalFloors; i++) {
          const bombI = bombs[i];
          floorDisplay[i] = floorDisplay[i].map((_, j) => j === bombI ? "💣" : "🟩");
        }

        gameOver = true;

        await transactionsQuery.addTransaction({
          user_id: playerId,
          type: "casino",
          currency: "rubies",
          amount: -betAmount
        });
        await usersQuery.updateCurrency(playerId, "rubies", -betAmount);

        return btn.update({
          embeds: [embeds.towerLooseEmbed(betAmount, currentFloor + 1, renderLignes())],
          components: []
        });
      } else {
        currentFloor++;
        totalGains = calculeGain(currentFloor);

        if (currentFloor === totalFloors) {
          gameOver = true;

          const gainFinal = totalGains - betAmount;
          await transactionsQuery.addTransaction({
            user_id: playerId,
            type: "casino",
            currency: "rubies",
            amount: gainFinal
          });
          await usersQuery.updateCurrency(playerId, "rubies", gainFinal);

          return btn.update({
            embeds: [embeds.towerWinEmbed(betAmount, currentFloor, totalGains, renderLignes())],
            components: []
          });
        }

        const showStop = currentFloor >= 1;

        await btn.update({
          embeds: [embeds.towerEmbed(betAmount, currentFloor, totalFloors, renderLignes(), totalGains)],
          components: createButtons(showStop),
        });
      }

    });

    collector.on("end", async() => {
      if (!gameOver) {
        await transactionsQuery.addTransaction({
          user_id: playerId,
          type: "casino",
          currency: "rubies",
          amount: -betAmount
        });
        await usersQuery.updateCurrency(playerId, "rubies", -betAmount);
        interaction.editReply({
          embeds: [embeds.errorEmbed("⏱️ Temps écoulé ! La partie est terminée.")],
          components: [],
        });
      }
    });
  },
};