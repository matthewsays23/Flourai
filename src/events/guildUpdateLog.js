const { Events } = require("discord.js");
const { createLogEmbed, sendLog, setGuildThumbnail } = require("../utils/modLog");

module.exports = {
  name: Events.GuildUpdate,
  async execute(oldGuild, newGuild, client) {
    const changes = [];

    if (oldGuild.premiumTier !== newGuild.premiumTier) {
      changes.push(`**Boost Tier:** ${oldGuild.premiumTier} -> ${newGuild.premiumTier}`);
    }

    if (oldGuild.premiumSubscriptionCount !== newGuild.premiumSubscriptionCount) {
      changes.push(`**Boost Count:** ${oldGuild.premiumSubscriptionCount || 0} -> ${newGuild.premiumSubscriptionCount || 0}`);
    }

    if (!changes.length) return;

    const embed = setGuildThumbnail(createLogEmbed(
      "Server Boost Status Changed",
      changes.join("\n")
    ), newGuild);

    await sendLog(client, newGuild, embed);
  },
};
