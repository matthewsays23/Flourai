const {
  SlashCommandBuilder,
  EmbedBuilder,
  ActionRowBuilder,
  StringSelectMenuBuilder,
  PermissionFlagsBits
} = require("discord.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("tickets")
    .setDescription("Send the Flourai support panel")
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async execute(interaction) {
    const embed = new EmbedBuilder()
      .setColor("#2f3136") // your Flourai soft tone
      .setTitle("<:emoji_41:1113830951877886084>  Support Panel")
      .setDescription(
        "Please select the category that best fits your request before opening a ticket by using the dropdown menu below. Our team will assist you shortly with care and attention.\n\n" +
        "-# Please use the ticket system before directly messaging a member of the **Leadership Team**. Thank you for your patience and respect."
      )
      .setImage("https://discord-webhook.com/uploads/5eeb568f88aa35519efc60d76aa6cb61.png") // replace with your Flourai banner

    const menu = new StringSelectMenuBuilder()
      .setCustomId("flourai_ticket_select")
      .setPlaceholder("Choose a ticket type")
      .addOptions([
        {
          label: "Staff Management",
          value: "management",
          emoji: "1065786283256991786"
        },
        {
          label: "Communications",
          value: "communications",
          emoji: "1065786238881235025"
        },
        {
          label: "General Inquiries",
          value: "general",
          emoji: "1065786194304192544"
        },
        {
          label: "Leadership",
          value: "leadership",
          emoji: "1065786263187247184"
        }
      ]);

    const row = new ActionRowBuilder().addComponents(menu);

    await interaction.deferReply({ ephemeral: true });

    await interaction.reply({
      embeds: [embed],
      components: [row],
    });

await interaction.editReply({
      content: "✅ Ticket panel sent.",
    });
  },
};