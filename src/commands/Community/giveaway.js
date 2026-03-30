const {
  SlashCommandBuilder,
  PermissionFlagsBits,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} = require("discord.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("giveaway")
    .setDescription("Start a Flourai giveaway")
    .addStringOption(option =>
      option
        .setName("prize")
        .setDescription("Prize for the giveaway")
        .setRequired(true)
    )
    .addIntegerOption(option =>
      option
        .setName("duration")
        .setDescription("Duration in minutes")
        .setRequired(true)
    )
    .addIntegerOption(option =>
      option
        .setName("winners")
        .setDescription("How many winners")
        .setRequired(true)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),

  async execute(interaction) {
    const prize = interaction.options.getString("prize");
    const duration = interaction.options.getInteger("duration");
    const winnerCount = interaction.options.getInteger("winners");

    const customerRoleId = process.env.CUSTOMER_ROLE_ID;
    if (!customerRoleId) {
      return interaction.reply({
        content: "❌ CUSTOMER_ROLE_ID is missing in your .env file.",
        ephemeral: true,
      });
    }

    const endsAt = Date.now() + duration * 60 * 1000;

    const embed = new EmbedBuilder()
      .setColor("#302c34")
      .setTitle("<:greenf:1065786334192603196> Flourai Giveaway")
      .setDescription(
        `**Prize:** ${prize}\n\n` +
        `Click the button below to enter.\n` +
        `You must have the **Customer** or above role to join.\n\n` +
        `⏰ Ends: <t:${Math.floor(endsAt / 1000)}:R>\n` +
        `🏆 Winners: ${winnerCount}`
      )
     .setFooter({ text: "Flourai · 2026", iconURL: "https://cdn.discordapp.com/attachments/1330406002688000085/1460089463521935482/p2.png?ex=69cb2947&is=69c9d7c7&hm=e0a6b3c1d830f7f2c5cf84aaf70bc5f049abc58ff19c11397b364be1af8d5f99" })
     .setTimestamp()

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId("giveaway_enter_placeholder")
        .setLabel("Enter Giveaway")
        .setEmoji("🌺")
        .setStyle(ButtonStyle.Primary)
    );

    const message = await interaction.channel.send({
      embeds: [embed],
      components: [row],
    });

    const giveawayId = message.id;

    row.components[0].setCustomId(`giveaway_enter_${giveawayId}`);

    await message.edit({
      components: [row],
    });

    await interaction.client.db.collection("giveaways").insertOne({
      giveawayId,
      guildId: interaction.guild.id,
      channelId: interaction.channel.id,
      messageId: message.id,
      hostId: interaction.user.id,
      prize,
      winnerCount,
      customerRoleId,
      participants: [],
      winnerIds: [],
      ended: false,
      endsAt,
      createdAt: Date.now(),
    });

    if (!interaction.client.giveawayTimeouts) {
      interaction.client.giveawayTimeouts = new Map();
    }

    const { scheduleGiveawayEnd } = require("../../utils/giveawayManager");
    scheduleGiveawayEnd(interaction.client, giveawayId, endsAt);

    await interaction.reply({
      content: "✅ Giveaway started.",
      ephemeral: true,
    });
  },
};