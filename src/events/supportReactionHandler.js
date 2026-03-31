// src/events/supportReactionHandler.js
const {
  ChannelType,
  PermissionFlagsBits,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} = require("discord.js");

const {
  SUPPORT_MESSAGE_ID,
  SUPPORT_ROLE_ID,
  TICKET_CATEGORY_ID,
  LOG_CHANNEL_ID,
  EMOJIS,
} = require("../config/supportTickets");

function cleanName(str) {
  return str.toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 12) || "user";
}

module.exports = (client) => {
  client.on("messageReactionAdd", async (reaction, user) => {
    if (user.bot) return;

    try {
      if (reaction.partial) await reaction.fetch();
      if (reaction.message.partial) await reaction.message.fetch();

      if (reaction.message.id !== SUPPORT_MESSAGE_ID) return;

      const emoji = reaction.emoji.name;
      const selected = EMOJIS[emoji];
      if (!selected) return;

      const guild = reaction.message.guild;
      const member = await guild.members.fetch(user.id);

      const shortUser = cleanName(user.username);
      const channelName = `${selected.channelPrefix}-${shortUser}`;

      // one open ticket per category per user
      const existing = guild.channels.cache.find(
        (c) =>
          c.type === ChannelType.GuildText &&
          c.name === channelName
      );

      if (existing) {
        await reaction.users.remove(user.id).catch(() => {});
        try {
          await user.send(`You already have an open **${selected.label}** ticket: #${existing.name}`);
        } catch {}
        return;
      }

      const permissionOverwrites = [
        {
          id: guild.roles.everyone.id,
          deny: [PermissionFlagsBits.ViewChannel],
        },
        {
          id: user.id,
          allow: [
            PermissionFlagsBits.ViewChannel,
            PermissionFlagsBits.SendMessages,
            PermissionFlagsBits.ReadMessageHistory,
            PermissionFlagsBits.AttachFiles,
            PermissionFlagsBits.EmbedLinks,
          ],
        },
      ];

      if (SUPPORT_ROLE_ID) {
        permissionOverwrites.push({
          id: SUPPORT_ROLE_ID,
          allow: [
            PermissionFlagsBits.ViewChannel,
            PermissionFlagsBits.SendMessages,
            PermissionFlagsBits.ReadMessageHistory,
            PermissionFlagsBits.ManageMessages,
            PermissionFlagsBits.AttachFiles,
          ],
        });
      }

      const channel = await guild.channels.create({
        name: channelName,
        type: ChannelType.GuildText,
        parent: TICKET_CATEGORY_ID || null,
        permissionOverwrites,
      });

      const ticketEmbed = new EmbedBuilder()
        .setColor("#302c34")
        .setTitle(`<:typo:1488251493579493376> ${selected.label} Ticket`)
        .setDescription(
          [
            `Hello ${member}, you have chosen to open a support ticket. While you wait for a staff member, please follow the format below to help us better understand the situation.`,
            "",
            "**Format**",
            "• What you need help with",
            "• A full explanation of the issue",
            "• Any usernames, screenshots, or details involved",
            "",
            "*A department member will assist you shortly.*",
          ].join("\n")
        )
         .setFooter({ text: "Flourai · 2026", iconURL: "https://cdn.discordapp.com/attachments/1330406002688000085/1460089463521935482/p2.png?ex=69cb2947&is=69c9d7c7&hm=e0a6b3c1d830f7f2c5cf84aaf70bc5f049abc58ff19c11397b364be1af8d5f99" })
        .setTimestamp();

      const closeRow = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId(`close_ticket:${channel.id}`)
          .setLabel("Close Ticket")
          .setEmoji("🔒")
          .setStyle(ButtonStyle.Danger)
      );

      await channel.send({
        content: SUPPORT_ROLE_ID ? `${member} <@&${SUPPORT_ROLE_ID}>` : `${member}`,
        embeds: [ticketEmbed],
        components: [closeRow],
      });

      if (LOG_CHANNEL_ID) {
        const logChannel = guild.channels.cache.get(LOG_CHANNEL_ID);
        if (logChannel) {
          const logEmbed = new EmbedBuilder()
            .setColor("#302c34")
            .setTitle("<:brownflower:1067479519205789757> New Ticket Opened")
            .addFields(
              { name: "User", value: `${user.tag} (${user.id})` },
              { name: "Category", value: selected.label },
              { name: "Channel", value: `${channel}` }
            )
            .setTimestamp();

          await logChannel.send({ embeds: [logEmbed] }).catch(() => {});
        }
      }

      // remove their reaction after opening
      await reaction.users.remove(user.id).catch(() => {});
    } catch (err) {
      console.error("❌ Reaction ticket error:", err);
    }
  });

  client.on("interactionCreate", async (interaction) => {
    if (!interaction.isButton()) return;
    if (!interaction.customId.startsWith("close_ticket:")) return;

    try {
      const channelId = interaction.customId.split(":")[1];
      if (interaction.channelId !== channelId) {
        return interaction.reply({
          content: ":x: That close button does not belong to this ticket.",
          ephemeral: true,
        });
      }

      const supportRoleId = SUPPORT_ROLE_ID;
      const isSupport =
        supportRoleId && interaction.member.roles.cache.has(supportRoleId);

      const isOwner = interaction.channel.permissionOverwrites.cache.has(interaction.user.id);

      if (!isSupport && !isOwner) {
        return interaction.reply({
          content: ":x: You do not have permission to close this ticket.",
          ephemeral: true,
        });
      }

      await interaction.reply({
        content: "🌺 Closing ticket in 5 seconds...",
      });

      if (LOG_CHANNEL_ID) {
        const logChannel = interaction.guild.channels.cache.get(LOG_CHANNEL_ID);
        if (logChannel) {
          const logEmbed = new EmbedBuilder()
            .setColor("#302c34")
            .setTitle("<:typo:1488251493579493376> Ticket Closed")
            .addFields(
              { name: "Channel", value: `${interaction.channel.name}` },
              { name: "Closed by", value: `${interaction.user.tag}` }
            )
            .setTimestamp();

          await logChannel.send({ embeds: [logEmbed] }).catch(() => {});
        }
      }

      setTimeout(async () => {
        await interaction.channel.delete().catch(console.error);
      }, 5000);
    } catch (err) {
      console.error("❌ Close ticket error:", err);
      if (!interaction.replied && !interaction.deferred) {
        await interaction.reply({
          content: "Something went wrong while closing the ticket.",
          ephemeral: true,
        }).catch(() => {});
      }
    }
  });
};