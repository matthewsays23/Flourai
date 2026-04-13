const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('status')
    .setDescription('Displays the bot\'s latency with a refresh button'),

  async execute(interaction) {
    const ping = Date.now() - interaction.createdTimestamp;
    const apiPing = Math.round(interaction.client.ws.ping);

    const embed = new EmbedBuilder()
       .setColor('2f3136')
      .setTitle('<:f_initial:1493040287143034993>  Flourai Status')
      .setDescription('All services are operating seamlessly within Flourai.\n\nHere’s a quick system overview:')
      .setTimestamp()
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
      .setTitle('<:brownflower:1067479519205789757> Flourai Status')
      .setDescription('All services are operating seamlessly within Flourai.\n\nHere’s a quick system overview:')
      .setTimestamp()
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