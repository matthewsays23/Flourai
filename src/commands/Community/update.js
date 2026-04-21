const {
  SlashCommandBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
} = require("discord.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("update")
    .setDescription("Update your Flourai verification roles and nickname"),

  async execute(interaction) {
    const verifyUrl = process.env.FLOURAI_VERIFY_URL || "https://flourai.io/verify";

    const embed = new EmbedBuilder()
      .setTitle("<:f_initial:1493040287143034993>  Update Verification")
      .setColor("#2f3136")
      .setDescription(
        [
          "Refresh your Flourai verification to sync your latest Roblox group rank. Use this after a rank change to update your nickname and Discord role binds.",
        ].join("\n")
      );

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setLabel("Update Verification")
        .setStyle(ButtonStyle.Link)
        .setURL(verifyUrl)
    );

    await interaction.reply({
      embeds: [embed],
      components: [row],
      ephemeral: true,
    });
  },
};
