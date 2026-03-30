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
      .setTitle("<:emoji_41:1113830951877886084> Ready to change the status?")
      .setDescription("Select a status type below and let Tea Concierge finish the rest. Be prepared to write a message!")
      .setFooter({ text: "Flourai · 2026", iconURL: "https://cdn.discordapp.com/attachments/1330406002688000085/1460089463521935482/p2.png?ex=69cb2947&is=69c9d7c7&hm=e0a6b3c1d830f7f2c5cf84aaf70bc5f049abc58ff19c11397b364be1af8d5f99" })

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
