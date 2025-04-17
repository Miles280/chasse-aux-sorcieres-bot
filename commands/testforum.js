const { SlashCommandBuilder, ChannelType, PermissionFlagsBits } = require("discord.js");

module.exports = {
  name: "testforum",
  description: "Crée un salon forum dans une catégorie.",
  permission: PermissionFlagsBits.ManageChannels,
  dm: false,

  data: new SlashCommandBuilder()
    .setName("testforum")
    .setDescription("Crée un salon forum dans une catégorie spécifique.")
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels),

  async execute(interaction) {
    const guild = interaction.guild;

    // 🔍 Récupérer la catégorie
    const category = guild.channels.cache.find(
      c => c.name === "Livret du règlement" && c.type === ChannelType.GuildCategory
    );

    if (!category) {
      return interaction.reply({
        content: "❌ La catégorie 'FORUMS' est introuvable.",
        ephemeral: true,
      });
    }

    try {
      // ✅ Créer le forum dans la catégorie
      const forum = await guild.channels.create({
        name: "forum-de-test",
        type: ChannelType.GuildForum,
        parent: category.id,
        topic: "Forum automatique dans FORUMS",
        defaultLayout: 2
      });

      // 🧵 Créer des posts
      for (let i = 1; i <= 2; i++) {
        const post = await forum.threads.create({
          name: `Sujet ${i}`,
          message: { content: `Ceci est le post numéro ${i}` },
        });

        await post.send(`Message automatique dans le post ${i}`);
      }

      return interaction.reply({ content: "✅ Forum créé dans la catégorie FORUMS !", ephemeral: true });

    } catch (err) {
      console.error("Erreur :", err);
      return interaction.reply({ content: "❌ Une erreur est survenue.", ephemeral: true });
    }
  },
};