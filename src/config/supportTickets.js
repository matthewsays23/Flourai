module.exports = {
  SUPPORT_MESSAGE_ID: process.env.SUPPORT_MESSAGE_ID,
  SUPPORT_CHANNEL_ID: process.env.SUPPORT_CHANNEL_ID,
  SUPPORT_ROLE_ID: process.env.SUPPORT_ROLE_ID,
  TICKET_CATEGORY_ID: process.env.TICKET_CATEGORY_ID, // optional
  LOG_CHANNEL_ID: process.env.LOG_CHANNEL_ID, // optional

  EMOJIS: {
    "📋": {
      key: "staff",
      label: "Staff Management",
      channelPrefix: "staff",
    },
    "📱": {
      key: "pr",
      label: "Public Relations",
      channelPrefix: "pr",
    },
    "❓": {
      key: "general",
      label: "General Inquiries",
      channelPrefix: "general",
    },
  },
};