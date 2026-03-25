const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const { sendVerifyLink } = require("../../utils/sendVerifyLink");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("verify")
    .setDescription("Get your Flourai verification link in DMs."),

  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true });

    try {
      await sendVerifyLink(interaction.client, interaction.user, interaction.guild.id);

      const embed = new EmbedBuilder()
        .setColor("#302c34")
        .setTitle("🌺 Verification Link Sent")
        .setDescription(
          "I sent the secure verification link in your DMs, please follow the instructions to finish your verification."
        );

      await interaction.editReply({ embeds: [embed] });
    } catch (err) {
      console.error("Verify command error:", err);

      await interaction.editReply({
        content:
          "❌ I couldn't DM you your verification link. Please enable Direct Messages and try again.",
      });
    }
  },
};