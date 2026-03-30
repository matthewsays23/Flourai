const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('status')
    .setDescription('Displays the bot\'s latency with a refresh button'),

  async execute(interaction) {
    const ping = Date.now() - interaction.createdTimestamp;
    const apiPing = Math.round(interaction.client.ws.ping);

    const embed = new EmbedBuilder()
       .setColor('302c34')
      .setTitle('Flourai Status')
      .setDescription('All services are operating seamlessly within Flourai.\n\nHere’s a quick system overview:')
      .setFooter({ text: "Flourai · 2026", iconURL: "https://cdn.discordapp.com/attachments/1330406002688000085/1337683889082208276/Discord_Icon.png?ex=69c434f4&is=69c2e374&hm=c12d076e3df65c49a5126a192d6600d354dc3b200841433d97dbf9c19262e8ba&" })
      .addFields(
        { name: 'Response Time', value: `${ping}ms`, inline: true },
        { name: 'API Status', value: `Operational`, inline: true }
      );

    const refreshButton = new ButtonBuilder()
      .setCustomId('refresh_ping')
      .setLabel('🔄 Refresh')
      .setStyle(ButtonStyle.Primary);

    const row = new ActionRowBuilder()
    .addComponents(refreshButton);

    await interaction.reply({ embeds: [embed], components: [row] });

    const filter = i => i.customId === 'refresh_ping' && i.user.id === interaction.user.id;
    const collector = interaction.channel.createMessageComponentCollector({ filter });

    collector.on('collect', async i => {
      if (i.customId === 'refresh_ping') {
        const newPing = Date.now() - i.createdTimestamp;
        const newApiPing = Math.round(interaction.client.ws.ping);

        const newEmbed = new EmbedBuilder()
         .setColor('302c34')
      .setTitle('Flourai Status')
      .setDescription('All services are operating seamlessly within Flourai.\n\nHere’s a quick system overview:')
      .setFooter({ text: "Flourai · 2026", iconURL: "https://cdn.discordapp.com/attachments/1330406002688000085/1460089463521935482/p2.png?ex=69cb2947&is=69c9d7c7&hm=e0a6b3c1d830f7f2c5cf84aaf70bc5f049abc58ff19c11397b364be1af8d5f99" })
      .addFields(
        { name: 'Response Time', value: `${ping}ms`, inline: true },
        { name: 'API Status', value: `Operational`, inline: true }
      );
        await i.update({ embeds: [newEmbed], components: [row] });
      }
    });

    collector.on('end', collected => {
      if (collected.size === 0) {
        interaction.editReply({ components: [] });
      }
    });
  }
};