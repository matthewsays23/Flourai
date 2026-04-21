const { Events } = require("discord.js");
const { createLogEmbed, sendLog, setGuildThumbnail } = require("../utils/modLog");

module.exports = {
  name: Events.ClientReady,
  once: true,
  async execute(client) {
    const guild =
      process.env.GUILD_ID
        ? client.guilds.cache.get(process.env.GUILD_ID)
        : client.guilds.cache.first();

    await sendLog(
      client,
      guild,
      setGuildThumbnail(
        createLogEmbed("Moderation Logs Online", "Deleted messages, edits, joins, leaves, boosts, unboosts, channels, categories, and profile changes will be logged here."),
        guild
      )
    );
  },
};
