const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const { syncDiscordMember } = require("../../utils/syncMember");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("update")
    .setDescription("Refresh your Flourai verification, nickname, and rank role."),

  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true });

    try {
      const result = await syncDiscordMember(interaction.member);

      const embed = new EmbedBuilder()
        .setColor("#302c34")
        .setTitle("🫧 Updated Successfully")
        .setDescription("We have updated your roles and username successfully.")
        .addFields(
          { name: "Roblox Username", value: result.username || "Unknown", inline: true },
          { name: "Rank", value: result.rankName || "Not in group", inline: true }
        )
        .setTimestamp();

      await interaction.editReply({ embeds: [embed] });
    } catch (err) {
      console.error("Update command error:", err);
      await interaction.editReply({
        content: `❌ Could not update your verification.\n**Reason:** ${err.message}`,
      });
    }
  },
};