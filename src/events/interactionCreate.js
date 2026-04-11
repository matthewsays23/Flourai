const {
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ActionRowBuilder,
  EmbedBuilder,
} = require("discord.js");

const { pickRandomWinners } = require("../utils/giveawayManager");


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

    try {
      // Slash Command Handler
      if (interaction.isChatInputCommand()) {
        const command = client.commands.get(interaction.commandName);
        if (!command) return;

        await command.execute(interaction, client);


        const collection = client.db.collection("giveaways");

        if (interaction.customId.startsWith("giveaway_enter_")) {
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

          // customer or above
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

        if (interaction.customId.startsWith("giveaway_reroll_")) {
          const giveawayId = interaction.customId.replace("giveaway_reroll_", "");
          const giveaway = await collection.findOne({ giveawayId });

          if (!giveaway) {
            return await safeReply({
              content: "❌ Giveaway not found.",
            });
          }

          if (!interaction.member.permissions.has("ManageGuild")) {
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

          const newWinners = pickRandomWinners(
            winnerPool,
            giveaway.winnerCount
          );

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
              `**Prize:** ${giveaway.prize}\n\n` +
                `🏆 New Winner(s): ${
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

        return;
      }

      // Dropdown (StringSelectMenu) Handler
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
        }

        return;
      }

      // Modal Submit Handler
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