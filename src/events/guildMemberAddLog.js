const { Events } = require("discord.js");
const {
  createLogEmbed,
  formatUser,
  sendLog,
  setUserThumbnail,
} = require("../utils/modLog");

module.exports = {
  name: Events.GuildMemberAdd,
  async execute(member, client) {
    const embed = setUserThumbnail(createLogEmbed(
      "Member Joined",
      [
        `**User:** ${formatUser(member.user)}`,
        `**Account Created:** <t:${Math.floor(member.user.createdTimestamp / 1000)}:F>`,
        `**Member Count:** ${member.guild.memberCount}`,
      ].join("\n")
    ), member.user);

    await sendLog(client, member.guild, embed);
  },
};
