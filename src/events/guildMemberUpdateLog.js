const { Events } = require("discord.js");
const {
  createLogEmbed,
  formatUser,
  sendLog,
  setUserThumbnail,
} = require("../utils/modLog");

function formatRoleList(roles) {
  if (!roles.length) return "None";
  return roles.map((role) => `${role}`).join(", ");
}

module.exports = {
  name: Events.GuildMemberUpdate,
  async execute(oldMember, newMember, client) {
    const embeds = [];

    if (!oldMember.premiumSince && newMember.premiumSince) {
      embeds.push(
        setUserThumbnail(createLogEmbed(
          "Server Boost Added",
          `${formatUser(newMember.user)} boosted the server.`
        ), newMember.user)
      );
    }

    if (oldMember.premiumSince && !newMember.premiumSince) {
      embeds.push(
        setUserThumbnail(createLogEmbed(
          "Server Boost Removed",
          `${formatUser(newMember.user)} is no longer boosting the server.`
        ), newMember.user)
      );
    }

    if (oldMember.nickname !== newMember.nickname) {
      embeds.push(
        setUserThumbnail(createLogEmbed(
          "Nickname Changed",
          [
            `**User:** ${formatUser(newMember.user)}`,
            `**Before:** ${oldMember.nickname || "None"}`,
            `**After:** ${newMember.nickname || "None"}`,
          ].join("\n")
        ), newMember.user)
      );
    }

    if (oldMember.avatar !== newMember.avatar) {
      embeds.push(
        setUserThumbnail(createLogEmbed(
          "Server Profile Changed",
          [
            `**User:** ${formatUser(newMember.user)}`,
            "**Change:** Server avatar updated",
          ].join("\n")
        ), newMember.user)
      );
    }

    const oldRoles = oldMember.roles.cache;
    const newRoles = newMember.roles.cache;
    const addedRoles = newRoles.filter((role) => !oldRoles.has(role.id));
    const removedRoles = oldRoles.filter((role) => !newRoles.has(role.id));

    if (addedRoles.size || removedRoles.size) {
      embeds.push(
        setUserThumbnail(createLogEmbed(
          "Member Roles Changed",
          `**User:** ${formatUser(newMember.user)}`
        ), newMember.user).addFields(
          {
            name: "Added",
            value: formatRoleList([...addedRoles.values()]),
          },
          {
            name: "Removed",
            value: formatRoleList([...removedRoles.values()]),
          }
        )
      );
    }

    for (const embed of embeds) {
      await sendLog(client, newMember.guild, embed);
    }
  },
};
