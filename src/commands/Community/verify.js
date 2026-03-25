const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const crypto = require("crypto");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("verify")
    .setDescription("Get your Flourai verification link in DMs."),

  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true });

    try {
      const token = crypto.randomBytes(24).toString("hex");

      await interaction.client.db.collection("pendingVerifications").updateOne(
        { token },
        {
          $set: {
            token,
            discordUserId: interaction.user.id,
            guildId: interaction.guild.id,
            createdAt: new Date(),
          },
        },
        { upsert: true }
      );

      const verifyUrl = `${process.env.BASE_URL}/verify/start?token=${token}`;

      await interaction.user.send(
        `🌸 Click the link below to verify with Roblox!\n🔒*We do not collect or store information that is collected through ROBLOX.*\n\n### • [LINK](<${verifyUrl}>)`
      );

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