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
  name: Events.MessageUpdate,
  async execute(oldMessage, newMessage, client) {
    const guild = newMessage.guild || client.guilds.cache.get(newMessage.guildId);
    if (!guild || newMessage.author?.bot) return;
    if (oldMessage.content === newMessage.content) return;

    const embed = setUserThumbnail(createLogEmbed(
      "Message Edited",
      [
        `**Author:** ${formatUser(newMessage.author)}`,
        `**Channel:** ${formatChannel(newMessage.channel)}`,
        `**Message ID:** ${newMessage.id}`,
        `**Jump:** ${newMessage.url}`,
      ].join("\n")
    ), newMessage.author)
      .addFields(
        {
          name: "Before",
          value: cleanText(oldMessage.content, oldMessage.partial ? "Old message was not cached." : "No text content."),
        },
        {
          name: "After",
          value: cleanText(newMessage.content, "No text content."),
        }
      );

    await sendLog(client, guild, embed);
  },
};
