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
        .setTitle("🌼 Updated Successfully")
        .setDescription("Configured your username and roles successfully! If you have any issues, please open a support ticket for assistance.")
         .setFooter({ text: "Flourai · 2026", iconURL: "https://cdn.discordapp.com/attachments/1330406002688000085/1337683889082208276/Discord_Icon.png?ex=69c434f4&is=69c2e374&hm=c12d076e3df65c49a5126a192d6600d354dc3b200841433d97dbf9c19262e8ba&" })
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