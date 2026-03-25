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
      .setTitle("🍵 Need help on your travels at Flourai? We can help guide you!")
      .setImage('https://cdn.discordapp.com/attachments/1486108708466458694/1486108740443701309/7.png?ex=69c4f6de&is=69c3a55e&hm=817c81848b12219431595cfe19b411693fa2cf8f1e4cb08ff8761def1e7d2b5c')
      .setDescription("Here at Flourai, we have created the opportunity to gain support from a staff member. To create a support ticket, please click one of the various categories/ the one that most suits what you're seeking. Please refrain from abusing the privilege to create support tickets, in the event that you have done so, you will be permanently banned from our Community Server.")
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