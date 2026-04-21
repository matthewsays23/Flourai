const {
  SlashCommandBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  PermissionFlagsBits,
} = require("discord.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("verifypanel")
    .setDescription("Send the Flourai Discord verification panel")
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async execute(interaction) {
    const verifyUrl = process.env.FLOURAI_VERIFY_URL || "https://flourai.io/verify";

    const embed = new EmbedBuilder()
      .setTitle("<:f_initial:1493040287143034993>  Flourai Verification")
      .setColor("#2f3136")
      .setImage('https://cdn.discordapp.com/attachments/1401654108561346720/1486355088489578556/welcomebanner.png?ex=69e77a8c&is=69e6290c&hm=5554b817cc10eaa0fc6f891c02a49c08f792aa7dccd2d49a881d12f668aac4be')
      .setDescription(
        [
          "Connect your Roblox account to Discord to receive your verified server identity. Verification can update your nickname and assign roles based on your Flourai Roblox group rank.",
          "",
          "-# If your roles do not update after verifying, please contact a member of the Leadership Team.",
        ].join("\n")
      );

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setLabel("Verify")
        .setStyle(ButtonStyle.Link)
        .setURL(verifyUrl)
    );

    await interaction.deferReply({ ephemeral: true });

    await interaction.channel.send({
      embeds: [embed],
      components: [row],
    });

    await interaction.editReply({
      content: "Verification panel sent.",
    });
  },
};
