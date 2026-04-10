const {
  SlashCommandBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} = require("discord.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("roles")
    .setDescription("Send role buttons"),

  async execute(interaction) {

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId("notification_roles")
        .setLabel("Notification Roles")
        .setStyle(ButtonStyle.Primary),
    );

    await interaction.reply({
      components: [row],
    });
  },
};