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
        .setTitle("<:emoji_41:1113830951877886084> Updated Successfully")
        .setDescription("Configured your username and roles successfully! If you have any issues, please open a support ticket for assistance.")
         .setFooter({ text: "Flourai · 2026", iconURL: "https://cdn.discordapp.com/attachments/1330406002688000085/1460089463521935482/p2.png?ex=69cb2947&is=69c9d7c7&hm=e0a6b3c1d830f7f2c5cf84aaf70bc5f049abc58ff19c11397b364be1af8d5f99" })
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