// src/commands/util/status.js
const { 
  SlashCommandBuilder, 
  StringSelectMenuBuilder, 
  StringSelectMenuOptionBuilder, 
  ActionRowBuilder, 
  EmbedBuilder 
} = require("discord.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("activity")
    .setDescription("Change the activity of the discord bot."),

  async execute(interaction) {
    // Tropical-themed embed
    const embed = new EmbedBuilder()
      .setColor("#302c34")
      .setTitle("🌿 Ready to change the status?")
      .setDescription("Select a status type below and let Tea Concierge finish the rest. Be prepared to write a message!")
      .setFooter({ text: "Flourai · 2026", iconURL: "https://cdn.discordapp.com/attachments/1330406002688000085/1337683889082208276/Discord_Icon.png?ex=69c434f4&is=69c2e374&hm=c12d076e3df65c49a5126a192d6600d354dc3b200841433d97dbf9c19262e8ba&" })

    // Dropdown menu
    const select = new StringSelectMenuBuilder()
      .setCustomId("status-type")
      .setPlaceholder("Choose a Status Type")
      .addOptions(
        new StringSelectMenuOptionBuilder()
          .setLabel("Playing")
          .setValue("0"), // 0 = Playing
        new StringSelectMenuOptionBuilder()
          .setLabel("Streaming")
          .setValue("1"), // 1 = Streaming
        new StringSelectMenuOptionBuilder()
          .setLabel("Listening")
          .setValue("2"), // 2 = Listening
        new StringSelectMenuOptionBuilder()
          .setLabel("Watching")
          .setValue("3"), // 3 = Watching
        new StringSelectMenuOptionBuilder()
          .setLabel("Competing")
          .setValue("5")  // 5 = Competing
      );

    const row = new ActionRowBuilder().addComponents(select);

    await interaction.reply({ embeds: [embed], components: [row], ephemeral: true });
  },
};
