const { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType } = require("discord.js");
const { gameEmbed, errorEmbed, successEmbed } = require("../utils/embeds");

module.exports = {
  name: "tour",
  description: "Jouer au jeu de l'étage piégé !",
  dm: false,

  data: new SlashCommandBuilder()
    .setName("tour")
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


    const user = await usersQuery.getUserByDiscordId(playerId)
    
    if (!user) {
      return interaction.reply({ embeds: [errorEmbed("Vous n'avez pas encore de compte !")], flags: 64 });
    } else if (user.rubies < betAmount) {
      return interaction.reply({ embeds: [errorEmbed("Vous n’avez pas assez de rubis pour miser cette somme.")], flags: 64 });
    } else if (betAmount <= 0) {
      return interaction.reply({ embeds: [errorEmbed("La mise doit être supérieure à 0.")], flags: 64 });
    }



    // 🔁 Initialisation
    const totalFloors = 10;
    let currentFloor = 0;
    let gameOver = false;
    let totalGains = 0;

    const floorDisplay = Array.from({ length: totalFloors }, () => ["⬛", "⬛", "⬛"]); // État visuel de chaque étage
    const bombs = Array.from({ length: totalFloors }, () => Math.floor(Math.random() * 3));
    const calculeGain = (floor) => betAmount * (1 + 0.1 * floor ** 2)
    const renderLignes = () => floorDisplay.map((ligne, i) => `Étage ${i + 1} : ${ligne.join(" ")}`);


    // Début de la logique du jeu
    await usersQuery.updateCurrency(playerId, "rubies", -betAmount)

    const createButtons = () => {
      const row = new ActionRowBuilder();
      for (let i = 0; i < 3; i++) {
        row.addComponents(
          new ButtonBuilder()
          .setCustomId(`choix_${i}`)
          .setLabel(`⬛`)
          .setStyle(ButtonStyle.Secondary)
        );
      }
      row.addComponents(
        new ButtonBuilder()
        .setCustomId("stop")
        .setLabel("💰 S'arrêter ici")
        .setStyle(ButtonStyle.Success)
      );
      return [row];
    };

    const gameMessage = await interaction.reply({
      embeds: [gameEmbed(betAmount, currentFloor, totalFloors, renderLignes(), totalGains)],
      components: createButtons()
    });

    const collector = gameMessage.createMessageComponentCollector({
      componentType: ComponentType.Button,
      time: 120000,
    });

    collector.on("collect", async btn => {
      if (btn.user.id !== playerId) {
        return btn.reply({ embeds: [errorEmbed("Ce jeu n'est pas le vôtre !")], flags: 64 });
      }

      if (gameOver) return;

      if (btn.customId === "stop") {
        gameOver = true;
        await usersQuery.updateCurrency(playerId, "rubies", totalGains)

        return btn.update({
          embeds: [successEmbed(`Vous vous êtes arrêté à l'étage ${currentFloor}.\nVous remportez **${totalGains} 🔴** !`)],
          components: []
        });
      }

      const choix = parseInt(btn.customId.split("_")[1]);
      const bomb = bombs[currentFloor];

      // Révéler toute la ligne
      floorDisplay[currentFloor] = floorDisplay[currentFloor].map((_, i) => i === bomb ? "💣" : "🟩");

      if (choix === bomb) {
        gameOver = true;
        return btn.update({
          embeds: [errorEmbed(`💥 Vous avez explosé à l'étage ${currentFloor + 1} ! Vous perdez votre mise.`).setDescription(renderLignes().join("\n"))],
          components: []
        });
      } else {
        currentFloor++;
        totalGains = calculeGain(currentFloor);

        if (currentFloor === totalFloors) {
          gameOver = true;
          await usersQuery.updateCurrency(playerId, "rubies", totalGains);

          return btn.update({
            embeds: [successEmbed(`🎉 Bravo ! Vous avez terminé les ${totalFloors} étages et gagné ${totalGains} 🔴 !`).setDescription(renderLignes().join("\n"))],
            components: []
          });
        }

        await btn.update({
          embeds: [gameEmbed(betAmount, currentFloor, totalFloors, renderLignes(), totalGains)],
          components: createButtons(),
        });
      }
    });

    collector.on("end", async() => {
      if (!gameOver) {
        interaction.editReply({
          embeds: [errorEmbed("⏱️ Temps écoulé ! La partie est terminée.")],
          components: [],
        });
      }
    });
  },
};