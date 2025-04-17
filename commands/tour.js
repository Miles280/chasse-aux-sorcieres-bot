const { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType } = require("discord.js");
const { gameEmbed, errorEmbed, successEmbed } = require("../utils/embeds");

module.exports = {
  name: "tour",
  description: "Jouer au jeu de l'étage piégé !",
  dm: false,

  data: new SlashCommandBuilder()
    .setName("tour")
    .setDescription("Jouez à un jeu de hasard en évitant la bombe.")
    .addIntegerOption(option =>
      option.setName("mise")
      .setDescription("Le montant que vous misez en rubis")
      .setRequired(true)
    ),

  async execute(interaction, bot) {
    const mise = interaction.options.getInteger("mise");
    const playerId = interaction.user.id;
    const player = interaction.member;
    const usersQuery = require("../database/queries/users")(bot.db);

    const totalEtages = 10;
    let currentEtage = 0;
    let gameOver = false;
    let totalGains = 0;

    // 🔁 Initialisation
    const bombes = Array.from({ length: totalEtages }, () => Math.floor(Math.random() * 3));
    const resultats = Array.from({ length: totalEtages }, () => ["⬛", "⬛", "⬛"]);

    const calculeGain = (niveau) => mise * (1 + 0.1 * étage ** 2)
    const renderLignes = () => resultats.map((ligne, i) => `Étage ${i + 1} : ${ligne.join(" ")}`);

    const user = await usersQuery.getUserByDiscordId(playerId)

    if (!user) {
      return interaction.reply({ embeds: [errorEmbed("Vous n'êtes pas encore inscrit !")], flags: 64 });
    }

    if (user.rubies < mise) {
      return interaction.reply({ embeds: [errorEmbed("Vous n’avez pas assez de rubis pour miser cette somme.")], flags: 64 });
    }

    // 💸 Déduction de la mise
    await usersQuery.updateCurrency(playerId, "rubies", -mise)

    // 🟦 Créer les boutons
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
        .setLabel("💰 Stop")
        .setStyle(ButtonStyle.Success)
      );
      return [row];
    };

    const reply = await interaction.reply({
      embeds: [gameEmbed(mise, currentEtage, totalEtages, renderLignes(), totalGains)],
      components: createButtons(),
    });

    const collector = reply.createMessageComponentCollector({
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
        await usersQuery.updateCurrency(playerId, "rubies", mise)

        return btn.update({
          embeds: [successEmbed(`Vous vous êtes arrêté à l'étage ${currentEtage}.\nVous remportez **${totalGains} rubis 🔴** !`)],
          components: [],
        });
      }

      const choix = parseInt(btn.customId.split("_")[1]);
      const bombe = bombes[currentEtage];

      // Révéler toute la ligne
      resultats[currentEtage] = resultats[currentEtage].map((_, i) => i === bombe ? "💣" : "🟩");

      if (choix === bombe) {
        gameOver = true;
        return btn.update({
          embeds: [errorEmbed(`💥 Vous avez explosé à l'étage ${currentEtage + 1} ! Vous perdez votre mise.`).setDescription(renderLignes().reverse().join("\n"))],
          components: [],
        });
      } else {
        currentEtage++;
        totalGains = calculeGain(currentEtage);

        if (currentEtage === totalEtages) {
          gameOver = true;
          await updateUserBalance(playerId, totalGains, "rubies");

          return btn.update({
            embeds: [successEmbed(`🎉 Bravo ! Vous avez terminé les ${totalEtages} étages et gagné ${totalGains} rubis 🔴 !`).setDescription(renderLignes().reverse().join("\n"))],
            components: [],
          });
        }

        await btn.update({
          embeds: [gameEmbed(mise, currentEtage, totalEtages, renderLignes(), totalGains)],
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