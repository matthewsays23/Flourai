const {
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ActionRowBuilder,
  EmbedBuilder,
  ChannelType,
  PermissionFlagsBits,
  ButtonBuilder,
  ButtonStyle,
} = require("discord.js");

const { pickRandomWinners } = require("../utils/giveawayManager");

const TICKET_CATEGORY_ID = "1486385173732786237";
const STAFF_ROLE_ID = "1252400319132991538";
const TRANSCRIPT_CHANNEL_ID = "1491970676427460738";

module.exports = {
  name: "interactionCreate",
  async execute(interaction) {
    const client = interaction.client;

    const safeReply = async (options) => {
      try {
        if (interaction.replied || interaction.deferred) {
          return await interaction.followUp({
            ephemeral: true,
            ...options,
          });
        }

        return await interaction.reply({
          ephemeral: true,
          ...options,
        });
      } catch (err) {
        console.error("safeReply error:", err);
      }
    };

    const ticketTypeMap = {
      management: {
        label: "Staff Management",
        emoji: "<:staff:1065786283256991786>",
        channelPrefix: "management",
      },
      communications: {
        label: "Communications",
        emoji: "<:communications:1065786238881235025>",
        channelPrefix: "communications",
      },
      general: {
        label: "General Inquiries",
        emoji: "<:general:1065786194304192544>",
        channelPrefix: "general",
      },
      leadership: {
        label: "Leadership",
        emoji: "<:leadership:1065786263187247184>",
        channelPrefix: "leadership",
      },
    };

    function buildTranscript(messages, channel, closerTag) {
      const lines = [];

      lines.push(`Transcript for #${channel.name}`);
      lines.push(`Channel ID: ${channel.id}`);
      lines.push(`Guild: ${channel.guild.name}`);
      lines.push(`Closed by: ${closerTag}`);
      lines.push(`Created at: ${new Date().toISOString()}`);
      lines.push("=".repeat(60));
      lines.push("");

      for (const msg of messages.reverse()) {
        const created = new Date(msg.createdTimestamp).toISOString();
        const author = `${msg.author?.tag || "Unknown User"} (${msg.author?.id || "unknown"})`;
        const content = msg.content?.trim() || "[no text content]";

        lines.push(`[${created}] ${author}`);
        lines.push(content);

        if (msg.attachments?.size) {
          lines.push("Attachments:");
          for (const attachment of msg.attachments.values()) {
            lines.push(`- ${attachment.url}`);
          }
        }

        if (msg.embeds?.length) {
          lines.push(`Embeds: ${msg.embeds.length}`);
        }

        lines.push("");
      }

      return lines.join("\n");
    }

    try {
      // Slash commands
      if (interaction.isChatInputCommand()) {
        const command = client.commands.get(interaction.commandName);
        if (!command) return;
        await command.execute(interaction, client);
        return;
      }

      // Buttons
      if (interaction.isButton()) {
        // Giveaway enter
        if (interaction.customId.startsWith("giveaway_enter_")) {
          const collection = client.db.collection("giveaways");
          const giveawayId = interaction.customId.replace("giveaway_enter_", "");
          const giveaway = await collection.findOne({ giveawayId });

          if (!giveaway) {
            return await safeReply({
              content: "❌ Giveaway not found.",
            });
          }

          if (giveaway.ended) {
            return await safeReply({
              content: "❌ This giveaway already ended.",
            });
          }

          const member = await interaction.guild.members
            .fetch(interaction.user.id)
            .catch(() => null);

          if (!member) {
            return await safeReply({
              content: "❌ Could not verify your roles.",
            });
          }

          const customerRole = await interaction.guild.roles
            .fetch(giveaway.customerRoleId)
            .catch(() => null);

          if (!customerRole) {
            return await safeReply({
              content: "❌ Customer role not found.",
            });
          }

          if (member.roles.highest.position < customerRole.position) {
            return await safeReply({
              content: "❌ You must have the customer role or higher to join this giveaway.",
            });
          }

          const participants = Array.isArray(giveaway.participants)
            ? giveaway.participants
            : [];

          if (participants.includes(interaction.user.id)) {
            return await safeReply({
              content: "🌺 You already entered this giveaway.",
            });
          }

          await collection.updateOne(
            { giveawayId },
            { $addToSet: { participants: interaction.user.id } }
          );

          return await safeReply({
            content: `✅ You entered the giveaway for **${giveaway.prize}**.`,
          });
        }

        // Giveaway reroll
        if (interaction.customId.startsWith("giveaway_reroll_")) {
          const collection = client.db.collection("giveaways");
          const giveawayId = interaction.customId.replace("giveaway_reroll_", "");
          const giveaway = await collection.findOne({ giveawayId });

          if (!giveaway) {
            return await safeReply({
              content: "❌ Giveaway not found.",
            });
          }

          if (!interaction.member.permissions.has(PermissionFlagsBits.ManageGuild)) {
            return await safeReply({
              content: "❌ You do not have permission to reroll giveaways.",
            });
          }

          if (!giveaway.ended) {
            return await safeReply({
              content: "❌ This giveaway has not ended yet.",
            });
          }

          const participants = Array.isArray(giveaway.participants)
            ? giveaway.participants
            : [];

          const existingWinnerIds = Array.isArray(giveaway.winnerIds)
            ? giveaway.winnerIds
            : [];

          const validParticipants = [];

          for (const userId of participants) {
            const member = await interaction.guild.members.fetch(userId).catch(() => null);
            if (!member) continue;

            const customerRole = await interaction.guild.roles
              .fetch(giveaway.customerRoleId)
              .catch(() => null);

            if (!customerRole) continue;
            if (member.roles.highest.position < customerRole.position) continue;

            validParticipants.push(userId);
          }

          const filteredPool = validParticipants.filter(
            (id) => !existingWinnerIds.includes(id)
          );

          const winnerPool = filteredPool.length ? filteredPool : validParticipants;

          const newWinners = pickRandomWinners(winnerPool, giveaway.winnerCount);

          await collection.updateOne(
            { giveawayId },
            {
              $set: {
                winnerIds: newWinners,
                rerolledAt: Date.now(),
                rerolledBy: interaction.user.id,
              },
            }
          );

          const rerollEmbed = new EmbedBuilder()
            .setColor("#302c34")
            .setTitle("<:teacup:1488275975052595260> Flourai Giveaway Rerolled")
            .setDescription(
              `**Prize:** ${giveaway.prize}\n\n🏆 New Winner(s): ${
                newWinners.length
                  ? newWinners.map((id) => `<@${id}>`).join(", ")
                  : "No valid entries"
              }`
            )
            .setFooter({
              text: "Flourai · 2026",
            });

          await interaction.channel.send({ embeds: [rerollEmbed] });

          return await safeReply({
            content: "✅ Giveaway rerolled.",
          });
        }

        // Claim ticket
        if (interaction.customId === "ticket_claim") {
          if (!interaction.member.roles.cache.has(STAFF_ROLE_ID)) {
            return await safeReply({
              content: "❌ Only staff members can claim tickets.",
            });
          }

          const currentTopic = interaction.channel.topic || "";
          if (currentTopic.includes("claimedBy:")) {
            return await safeReply({
              content: "❌ This ticket has already been claimed.",
            });
          }

          const updatedTopic = currentTopic
            ? `${currentTopic} | claimedBy:${interaction.user.id}`
            : `claimedBy:${interaction.user.id}`;

          await interaction.channel.setTopic(updatedTopic);

          const claimEmbed = new EmbedBuilder()
            .setColor("#2f3136")
            .setTitle("<:f_initial:1493040287143034993>  Ticket Claimed!")
            .setDescription(`${interaction.user} has claimed this ticket and will be assisting shortly.`);

          await interaction.channel.send({ embeds: [claimEmbed] });

          return await safeReply({
            content: "✅ You claimed this ticket.",
          });
        }

        // Transcript
        if (interaction.customId === "ticket_transcript") {
          if (
            !interaction.member.roles.cache.has(STAFF_ROLE_ID) &&
            !interaction.member.permissions.has(PermissionFlagsBits.ManageChannels)
          ) {
            return await safeReply({
              content: "❌ Only staff can generate transcripts!",
            });
          }

          await interaction.deferReply({ ephemeral: true });

          const fetched = await interaction.channel.messages.fetch({ limit: 100 });
          const transcript = buildTranscript(
            Array.from(fetched.values()),
            interaction.channel,
            interaction.user.tag
          );

          const buffer = Buffer.from(transcript, "utf-8");
          const transcriptChannel = interaction.guild.channels.cache.get(TRANSCRIPT_CHANNEL_ID);

          if (!transcriptChannel) {
            return await interaction.editReply({
              content: "❌ Transcript channel not found.",
            });
          }

          await transcriptChannel.send({
            content: `📄 Transcript from ${interaction.channel} generated by ${interaction.user}`,
            files: [
              {
                attachment: buffer,
                name: `${interaction.channel.name}-transcript.txt`,
              },
            ],
          });

          return await interaction.editReply({
            content: "✅ Transcript has been sent.",
          });
        }

        // Close ticket
        if (interaction.customId === "ticket_close") {
          const isStaff =
            interaction.member.roles.cache.has(STAFF_ROLE_ID) ||
            interaction.member.permissions.has(PermissionFlagsBits.ManageChannels);

          if (!isStaff) {
            return await safeReply({
              content: "❌ Only staff can close tickets.",
            });
          }

          await interaction.deferReply({ ephemeral: true });

          const fetched = await interaction.channel.messages.fetch({ limit: 100 });
          const transcript = buildTranscript(
            Array.from(fetched.values()),
            interaction.channel,
            interaction.user.tag
          );

          const buffer = Buffer.from(transcript, "utf-8");
          const transcriptChannel = interaction.guild.channels.cache.get(TRANSCRIPT_CHANNEL_ID);

          if (transcriptChannel) {
            await transcriptChannel.send({
              content: `📄 Final transcript from **${interaction.channel.name}** closed by ${interaction.user}`,
              files: [
                {
                  attachment: buffer,
                  name: `${interaction.channel.name}-transcript.txt`,
                },
              ],
            });
          }

          await interaction.editReply({
            content: "✅ Closing ticket...",
          });

          setTimeout(async () => {
            try {
              await interaction.channel.delete();
            } catch (err) {
              console.error("Ticket delete error:", err);
            }
          }, 2000);

          return;
        }
      }

      // Dropdowns
      if (interaction.isStringSelectMenu()) {
        if (interaction.customId === "status-type") {
          const activityType = parseInt(interaction.values[0], 10);

          const modal = new ModalBuilder()
            .setCustomId(`status-modal-${activityType}`)
            .setTitle("Let's Finish Up");

          const input = new TextInputBuilder()
            .setCustomId("status-text")
            .setLabel("What should my status say?")
            .setStyle(TextInputStyle.Short)
            .setPlaceholder("Brewing Tea 🍵")
            .setRequired(true);

          modal.addComponents(new ActionRowBuilder().addComponents(input));
          await interaction.showModal(modal);
          return;
        }

        if (interaction.customId === "flourai_ticket_select") {
          const selected = interaction.values[0];
          const typeData = ticketTypeMap[selected];

          if (!typeData) {
            return await safeReply({
              content: "❌ Invalid ticket type selected.",
            });
          }

          const existingTicket = interaction.guild.channels.cache.find((channel) => {
            if (channel.parentId !== TICKET_CATEGORY_ID) return false;
            if (!channel.topic) return false;
            return channel.topic.includes(`ticketOwner:${interaction.user.id}`);
          });

          if (existingTicket) {
            return await safeReply({
              content: `❌ You already have an open ticket: ${existingTicket}`,
            });
          }

          const ticketChannel = await interaction.guild.channels.create({
            name: `${typeData.channelPrefix}-${interaction.user.username}`.toLowerCase(),
            type: ChannelType.GuildText,
            parent: TICKET_CATEGORY_ID,
            topic: `${selected}`,
            permissionOverwrites: [
              {
                id: interaction.guild.id,
                deny: [PermissionFlagsBits.ViewChannel],
              },
              {
                id: interaction.user.id,
                allow: [
                  PermissionFlagsBits.ViewChannel,
                  PermissionFlagsBits.SendMessages,
                  PermissionFlagsBits.ReadMessageHistory,
                  PermissionFlagsBits.AttachFiles,
                  PermissionFlagsBits.EmbedLinks,
                ],
              },
              {
                id: STAFF_ROLE_ID,
                allow: [
                  PermissionFlagsBits.ViewChannel,
                  PermissionFlagsBits.SendMessages,
                  PermissionFlagsBits.ReadMessageHistory,
                  PermissionFlagsBits.ManageChannels,
                  PermissionFlagsBits.AttachFiles,
                  PermissionFlagsBits.EmbedLinks,
                ],
              },
              {
                id: client.user.id,
                allow: [
                  PermissionFlagsBits.ViewChannel,
                  PermissionFlagsBits.SendMessages,
                  PermissionFlagsBits.ReadMessageHistory,
                  PermissionFlagsBits.ManageChannels,
                  PermissionFlagsBits.AttachFiles,
                  PermissionFlagsBits.EmbedLinks,
                ],
              },
            ],
          });

          const ticketEmbed = new EmbedBuilder()
            .setColor("#2f3136")
            .setTitle(`${typeData.emoji}  Welcome to your ticket!`)
            .setDescription(
              `Thank you for opening a **${typeData.label}** ticket. Please explain your request in detail and a member of our team will assist you as soon as possible.\n\n-# Please remain patient while waiting for a response.`
            )
            .setTimestamp()

          const buttons = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
              .setCustomId("ticket_claim")
              .setLabel("Claim")
              .setStyle(ButtonStyle.Secondary),
            new ButtonBuilder()
              .setCustomId("ticket_transcript")
              .setLabel("Transcript")
              .setStyle(ButtonStyle.Primary),
            new ButtonBuilder()
              .setCustomId("ticket_close")
              .setLabel("Close")
              .setStyle(ButtonStyle.Danger)
          );

          await ticketChannel.send({
            content: `${interaction.user} <@&${STAFF_ROLE_ID}>`,
            embeds: [ticketEmbed],
            components: [buttons],
          });

          return await safeReply({
            content: `✅ Your ticket has been created: ${ticketChannel}`,
          });
        }

        return;
      }

      // Modal submits
      if (interaction.isModalSubmit()) {
        if (interaction.customId.startsWith("status-modal-")) {
          const activityType = parseInt(interaction.customId.split("-")[2], 10);
          const statusText = interaction.fields.getTextInputValue("status-text");

          await client.user.setActivity(statusText, { type: activityType });

          const username = interaction.user.globalName || interaction.user.username;

          const confirmEmbed = new EmbedBuilder()
            .setColor("#302c34")
            .setTitle(
              `<:brownflower:1067479519205789757> Nice, ${username}! Loving the status change!`
            )
            .setDescription(
              `Successfully updated the bot status.\n\nFeed: **${statusText}**`
            )
            .setFooter({
              text: "Flourai · 2026",
              iconURL:
                "https://cdn.discordapp.com/attachments/1330406002688000085/1460089463521935482/p2.png?ex=69cb2947&is=69c9d7c7&hm=e0a6b3c1d830f7f2c5cf84aaf70bc5f049abc58ff19c11397b364be1af8d5f99",
            });

          return await safeReply({
            embeds: [confirmEmbed],
          });
        }

        return;
      }
    } catch (error) {
      console.error("interactionCreate error:", error);

      try {
        if (interaction.replied || interaction.deferred) {
          await interaction.followUp({
            content: "⚠️ There was an error executing this interaction.",
            ephemeral: true,
          });
        } else {
          await interaction.reply({
            content: "⚠️ There was an error executing this interaction.",
            ephemeral: true,
          });
        }
      } catch (err) {
        console.error("Failed to send interaction error response:", err);
      }
    }
  },
};