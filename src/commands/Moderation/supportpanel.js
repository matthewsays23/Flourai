// src/commands/util/supportpanel.js
const {
  SlashCommandBuilder,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} = require("discord.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("supportpanel")
    .setDescription("Send the Flourai support panel."),

  async execute(interaction) {
    const embed = new EmbedBuilder()
      .setColor("#302c34") // soft pink tone
      .setTitle("🍵 Flourai Support Panel")
      .setDescription(
        [
          "Flourai takes pride in delivering an exceptional customer experience. Our mission is to make your time with us both enjoyable and satisfying. That’s why we’re always here, working around the clock, just for **you**!",
          "",
          "If you have any questions or concerns, our team is here to help. You can reach out by opening a Customer Experience Ticket. Below are the categories we offer and what each one specializes in:",
          "",
          "📋 **Staff Management** — For inquiries about staff operations, resolving team conflicts, or reporting concerns regarding a management member.",
          "🌐 **Public Relations** — For inquiries about alliances, partnership opportunities, or issues involving external group relations.",
          "📄 **Appeal Tickets** — For appealing bans, blacklists, or discussing moderation actions applied to your Roblox/Discord account.",
          "❓ **General Inquiries** — For general questions or support regarding group operations, low-rank concerns, or miscellaneous topics.",
        ].join("\n")
      )
     .setFooter({ text: "Flourai · 2026", iconURL: "https://cdn.discordapp.com/attachments/1330406002688000085/1337683889082208276/Discord_Icon.png?ex=69c434f4&is=69c2e374&hm=c12d076e3df65c49a5126a192d6600d354dc3b200841433d97dbf9c19262e8ba&" })

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId("support_general")
        .setLabel("General Inquiries")
        .setEmoji("❓")
        .setStyle(ButtonStyle.Secondary),

      new ButtonBuilder()
        .setCustomId("support_staff")
        .setLabel("Staff Management")
        .setEmoji("📋")
        .setStyle(ButtonStyle.Secondary),

      new ButtonBuilder()
        .setCustomId("support_pr")
        .setLabel("Public Relations")
        .setEmoji("🌐")
        .setStyle(ButtonStyle.Secondary),

      new ButtonBuilder()
        .setCustomId("support_appeal")
        .setLabel("Appeals")
        .setEmoji("📄")
        .setStyle(ButtonStyle.Secondary)
    );

    await interaction.reply({
      embeds: [embed],
      components: [row],
    });
  },
};