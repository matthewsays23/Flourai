const { Events } = require("discord.js");
const {
  cleanText,
  createLogEmbed,
  formatChannel,
  formatUser,
  sendLog,
  setUserThumbnail,
} = require("../utils/modLog");

module.exports = {
  name: Events.MessageDelete,
  async execute(message, client) {
    const guild = message.guild || client.guilds.cache.get(message.guildId);
    if (!guild) return;

    const attachments = message.attachments?.size
      ? [...message.attachments.values()].map((attachment) => attachment.url).join("\n")
      : "None";

    const embed = setUserThumbnail(createLogEmbed(
      "Message Deleted",
      [
        `**Author:** ${formatUser(message.author)}`,
        `**Channel:** ${formatChannel(message.channel)}`,
        `**Message ID:** ${message.id}`,
      ].join("\n")
    ), message.author)
      .addFields(
        {
          name: "Content",
          value: cleanText(message.content, message.partial ? "Message was not cached." : "No text content."),
        },
        {
          name: "Attachments",
          value: cleanText(attachments),
        }
      );

    await sendLog(client, guild, embed);
  },
};
