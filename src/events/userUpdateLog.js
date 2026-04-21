const { Events } = require("discord.js");
const {
  createLogEmbed,
  formatUser,
  sendLog,
  setUserThumbnail,
} = require("../utils/modLog");

module.exports = {
  name: Events.UserUpdate,
  async execute(oldUser, newUser, client) {
    const changes = [];

    if (oldUser.username !== newUser.username) {
      changes.push(`**Username:** ${oldUser.username} -> ${newUser.username}`);
    }

    if (oldUser.globalName !== newUser.globalName) {
      changes.push(`**Display Name:** ${oldUser.globalName || "None"} -> ${newUser.globalName || "None"}`);
    }

    if (oldUser.avatar !== newUser.avatar) {
      changes.push("**Avatar:** Updated");
    }

    if (oldUser.banner !== newUser.banner) {
      changes.push("**Banner:** Updated");
    }

    if (!changes.length) return;

    const guild =
      process.env.GUILD_ID
        ? client.guilds.cache.get(process.env.GUILD_ID)
        : client.guilds.cache.first();

    const embed = setUserThumbnail(createLogEmbed(
      "User Profile Changed",
      [`**User:** ${formatUser(newUser)}`, ...changes].join("\n")
    ), newUser);

    await sendLog(client, guild, embed);
  },
};
