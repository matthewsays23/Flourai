const {
  SlashCommandBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} = require("discord.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("addbuttons")
    .setDescription("Add buttons to an existing message")
    .addStringOption(option =>
      option.setName("messageid")
        .setDescription("Message ID")
        .setRequired(true)
    ),

  async execute(interaction) {
    const messageId = interaction.options.getString("messageid");

    const channel = interaction.channel;

    try {
      const message = await channel.messages.fetch(messageId);

      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId("notification_roles")
          .setLabel("Notification Roles")
          .setStyle(ButtonStyle.Secondary),
      );

      await message.edit({
        content: message.content || "‎",
        embeds: message.embeds,
        components: [row],
      });

      await interaction.reply({
        content: "✅ Buttons added.",
        ephemeral: true,
      });

    } catch (err) {
      console.error(err);

      await interaction.reply({
        content: "❌ Failed to edit message.",
        ephemeral: true,
      });
    }
  },
};