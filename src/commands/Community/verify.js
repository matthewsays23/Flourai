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
        .setTitle("Verification Link Sent")
        .setDescription(
          "I sent the secure verification link in your DMs, please follow the instructions to finish your verification."
        )
        .setFooter({ text: "Flourai · 2026", iconURL: "https://cdn.discordapp.com/attachments/1330406002688000085/1460089463521935482/p2.png?ex=69cb2947&is=69c9d7c7&hm=e0a6b3c1d830f7f2c5cf84aaf70bc5f049abc58ff19c11397b364be1af8d5f99" });

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