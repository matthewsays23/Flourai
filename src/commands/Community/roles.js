const {
  SlashCommandBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
} = require("discord.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("rolespanel")
    .setDescription("Send the Flourai roles panel"),

  async execute(interaction) {
    const embed = new EmbedBuilder()
    .setTitle("<:emoji_41:1113830951877886084>  Want to stay up-to date on Flourai's operations?")
      .setColor("#2f3136")
      .setImage("https://cdn.discordapp.com/attachments/1330406002688000085/1337683303230214184/8.png?ex=69d9f528&is=69d8a3a8&hm=c9f65645a072fd24374d18d419e443fc0603689656383ea8f1f25afe9505adf6&")
      .setDescription(
        [
          "",
          "Flourai now offers self-assignable role management, allowing you to customize which topics you receive notifications for. To receive pings for a specific topic, please use the buttons below and select the appropriate role. If you wish to remove a role, simply return to the menu and deselect it.",
          "-----",
          "-# If you have any questions or require assistance, please contact a member of the **Leadership Team**."
        ].join("\n")
      );

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId("notification_roles")
        .setLabel("Notification Roles")
        .setStyle(ButtonStyle.Secondary),

    );

    await interaction.reply({
      embeds: [embed],
      components: [row],
    });
  },
};