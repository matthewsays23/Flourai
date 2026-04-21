const { AuditLogEvent, ChannelType, Events } = require("discord.js");
const {
  createLogEmbed,
  formatChannel,
  formatUser,
  sendLog,
  setGuildThumbnail,
  setUserThumbnail,
} = require("../utils/modLog");

function channelKind(channel) {
  return channel.type === ChannelType.GuildCategory ? "Category" : "Channel";
}

module.exports = {
  name: Events.ChannelCreate,
  async execute(channel, client) {
    if (!channel.guild) return;

    await new Promise((resolve) => setTimeout(resolve, 1000));

    const auditEntry = await channel.guild.fetchAuditLogs({
      type: AuditLogEvent.ChannelCreate,
      limit: 5,
    })
      .then((logs) => logs.entries.find((entry) => {
        return entry.target?.id === channel.id && Date.now() - entry.createdTimestamp < 10000;
      }))
      .catch(() => null);

    const kind = channelKind(channel);
    const embed = createLogEmbed(
      `${kind} Created`,
      [
        `**${kind}:** ${formatChannel(channel)}`,
        `**Type:** ${ChannelType[channel.type] || channel.type}`,
        `**Created By:** ${auditEntry?.executor ? formatUser(auditEntry.executor) : "Unknown"}`,
        `**ID:** ${channel.id}`,
      ].join("\n")
    );

    if (auditEntry?.executor) {
      setUserThumbnail(embed, auditEntry.executor);
    } else {
      setGuildThumbnail(embed, channel.guild);
    }

    await sendLog(client, channel.guild, embed);
  },
};
