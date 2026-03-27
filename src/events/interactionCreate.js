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

    try {
      // 🔹 Slash Command Handler
      if (interaction.isChatInputCommand()) {
        const command = client.commands.get(interaction.commandName);
        if (!command) return;

        await command.execute(interaction, client);
        return;
      }

      // 🔹 Button Handler
      if (interaction.isButton()) {
        const collection = client.db.collection("giveaways");

        if (interaction.customId.startsWith("giveaway_enter_")) {
          const giveawayId = interaction.customId.replace("giveaway_enter_", "");
          const giveaway = await collection.findOne({ giveawayId });

          if (!giveaway) {
            return interaction.reply({
              content: "❌ Giveaway not found.",
              ephemeral: true,
            });
          }

          if (giveaway.ended) {
            return interaction.reply({
              content: "❌ This giveaway already ended.",
              ephemeral: true,
            });
          }

          const member = await interaction.guild.members
            .fetch(interaction.user.id)
            .catch(() => null);

          if (!member) {
            return interaction.reply({
              content: "❌ Could not verify your roles.",
              ephemeral: true,
            });
          }


if (!member) {
  return interaction.reply({
    content: "❌ Could not verify your roles.",
    ephemeral: true,
  });
}

const customerRole = await interaction.guild.roles.fetch(giveaway.customerRoleId).catch(() => null);

if (!customerRole) {
  return interaction.reply({
    content: "❌ Customer role not found.",
    ephemeral: true,
  });
}

// customer or above
if (member.roles.highest.position < customerRole.position) {
  return interaction.reply({
    content: "❌ You must have the customer role or higher to join this giveaway.",
    ephemeral: true,
  });
}

          if (giveaway.participants.includes(interaction.user.id)) {
            return interaction.reply({
              content: "🌺 You already entered this giveaway.",
              ephemeral: true,
            });
          }

          await collection.updateOne(
            { giveawayId },
            { $addToSet: { participants: interaction.user.id } }
          );

          return interaction.reply({
            content: `✅ You entered the giveaway for **${giveaway.prize}**.`,
            ephemeral: true,
          });
        }

        if (interaction.customId.startsWith("giveaway_reroll_")) {
          const giveawayId = interaction.customId.replace("giveaway_reroll_", "");
          const giveaway = await collection.findOne({ giveawayId });

          if (!giveaway) {
            return interaction.reply({
              content: "❌ Giveaway not found.",
              ephemeral: true,
            });
          }

          if (!interaction.member.permissions.has("ManageGuild")) {
            return interaction.reply({
              content: "❌ You do not have permission to reroll giveaways.",
              ephemeral: true,
            });
          }

          if (!giveaway.ended) {
            return interaction.reply({
              content: "❌ This giveaway has not ended yet.",
              ephemeral: true,
            });
          }

          const validParticipants = [];

          for (const userId of giveaway.participants) {
            const member = await interaction.guild.members.fetch(userId).catch(() => null);
            if (!member) continue;
           const customerRole = await guild.roles.fetch(giveaway.customerRoleId).catch(() => null);
if (!customerRole) continue;

if (member.roles.highest.position < customerRole.position) continue;
            validParticipants.push(userId);
          }

          const filteredPool = validParticipants.filter(
            id => !giveaway.winnerIds.includes(id)
          );

          const newWinners = pickRandomWinners(
            filteredPool.length ? filteredPool : validParticipants,
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
            .setColor("#F5E6EA")
            .setTitle("🌸 Flourai Giveaway Rerolled")
            .setDescription(
              `**Prize:** ${giveaway.prize}\n\n` +
              `🏆 New Winner(s): ${
                newWinners.length
                  ? newWinners.map(id => `<@${id}>`).join(", ")
                  : "No valid entries"
              }`
            )
            .setFooter({
              text: "Flourai · 2026",
            });

          await interaction.channel.send({ embeds: [rerollEmbed] });

          return interaction.reply({
            content: "✅ Giveaway rerolled.",
            ephemeral: true,
          });
        }

        return;
      }

      // 🔹 Dropdown (StringSelectMenu) Handler
      if (interaction.isStringSelectMenu()) {
        if (interaction.customId === "status-type") {
          const activityType = parseInt(interaction.values[0]);

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

      // 🔹 Modal Submit Handler
      if (interaction.isModalSubmit()) {
        if (interaction.customId.startsWith("status-modal-")) {
          const activityType = parseInt(interaction.customId.split("-")[2]);
          const statusText = interaction.fields.getTextInputValue("status-text");

          await client.user.setActivity(statusText, { type: activityType });

          const username = interaction.user.globalName || interaction.user.username;

          const confirmEmbed = new EmbedBuilder()
            .setColor("#F5E6EA")
            .setTitle(`🌺 Nice, ${username}! Loving the atmosphere change!`)
            .setDescription(
              `Successfully updated the bot status.\n\nFeed: **${statusText}**`
            )
            .setFooter({
              text: "Flourai.io · 2026",
              iconURL: "https://imgur.com/jiu0zEe.png",
            });

          await interaction.reply({ embeds: [confirmEmbed], ephemeral: true });
        }

        return;
      }
    } catch (error) {
      console.error("interactionCreate error:", error);

      if (interaction.replied || interaction.deferred) {
        await interaction
          .followUp({
            content: "⚠️ There was an error executing this interaction.",
            ephemeral: true,
          })
          .catch(() => {});
      } else {
        await interaction
          .reply({
            content: "⚠️ There was an error executing this interaction.",
            ephemeral: true,
          })
          .catch(() => {});
      }
    }
  },
};