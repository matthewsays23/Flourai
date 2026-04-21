const { Events } = require("discord.js");
const {
  createLogEmbed,
  formatUser,
  sendLog,
  setUserThumbnail,
} = require("../utils/modLog");

module.exports = {
  name: Events.GuildMemberRemove,
  async execute(member, client) {
    const joinedAt = member.joinedTimestamp
      ? `<t:${Math.floor(member.joinedTimestamp / 1000)}:F>`
      : "Unknown";

    const embed = setUserThumbnail(createLogEmbed(
      "Member Left",
      [
        `**User:** ${formatUser(member.user)}`,
        `**Joined:** ${joinedAt}`,
        `**Member Count:** ${member.guild.memberCount}`,
      ].join("\n")
    ), member.user);

    await sendLog(client, member.guild, embed);
  },
};
