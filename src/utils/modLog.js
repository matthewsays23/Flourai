const { EmbedBuilder, PermissionFlagsBits } = require("discord.js");

const LOG_CHANNEL_ID = process.env.MOD_LOG_CHANNEL_ID || process.env.LOG_CHANNEL_ID;
const LOG_COLOR = "#302c34";
const MAX_FIELD_LENGTH = 1024;

function cleanText(value, fallback = "None") {
  if (!value) return fallback;

  const text = String(value).replace(/\s+/g, " ").trim();
  if (!text) return fallback;

  return text.length > MAX_FIELD_LENGTH
    ? `${text.slice(0, MAX_FIELD_LENGTH - 3)}...`
    : text;
}

function formatUser(user) {
  if (!user) return "Unknown user";
  return `${user} (${user.tag || user.username || user.id})`;
}

function formatChannel(channel) {
  if (!channel) return "Unknown channel";
  return `${channel} (#${channel.name || channel.id})`;
}

function setUserThumbnail(embed, user) {
  const avatarUrl = user?.displayAvatarURL?.({ dynamic: true, size: 256 });
  if (avatarUrl) embed.setThumbnail(avatarUrl);
  return embed;
}

function setGuildThumbnail(embed, guild) {
  const iconUrl = guild?.iconURL?.({ dynamic: true, size: 256 });
  if (iconUrl) embed.setThumbnail(iconUrl);
  return embed;
}

async function getLogChannel(client, guild = null) {
  if (!LOG_CHANNEL_ID) {
    console.warn("Moderation logs are disabled: set LOG_CHANNEL_ID or MOD_LOG_CHANNEL_ID in .env.");
    return null;
  }

  const cached = guild?.channels?.cache?.get(LOG_CHANNEL_ID) || client.channels.cache.get(LOG_CHANNEL_ID);
  if (cached?.isTextBased?.()) return cached;

  const fetched = await client.channels.fetch(LOG_CHANNEL_ID).catch(() => null);
  if (fetched?.isTextBased?.()) return fetched;

  console.warn(`Moderation log channel ${LOG_CHANNEL_ID} was not found or is not text-based.`);
  return null;
}

async function sendLog(client, guild, embed) {
  const channel = await getLogChannel(client, guild);
  if (!channel) return;

  const me = guild?.members?.me;
  if (
    me &&
    channel.permissionsFor &&
    !channel.permissionsFor(me)?.has([
      PermissionFlagsBits.ViewChannel,
      PermissionFlagsBits.SendMessages,
      PermissionFlagsBits.EmbedLinks,
    ])
  ) {
    console.warn(`Missing permissions to send moderation logs in channel ${channel.id}.`);
    return;
  }

  await channel.send({ embeds: [embed] }).catch((error) => {
    console.error("Failed to send moderation log:", error);
  });
}

function createLogEmbed(title, description) {
  return new EmbedBuilder()
    .setColor(LOG_COLOR)
    .setTitle(title)
    .setDescription(description)
    .setTimestamp();
}

module.exports = {
  cleanText,
  createLogEmbed,
  formatChannel,
  formatUser,
  sendLog,
  setGuildThumbnail,
  setUserThumbnail,
};
