const { Events } = require("discord.js");
const { restoreGiveaways } = require("../utils/giveawayManager");

module.exports = {
  name: Events.ClientReady,
  once: true,
  async execute(client) {
    console.log(`🌺 Logged in as ${client.user.tag}`);

    try {
      await restoreGiveaways(client);
    } catch (error) {
      console.error("Failed to restore giveaways:", error);
    }
  },
};