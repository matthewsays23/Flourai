const {
  ActionRowBuilder,
  StringSelectMenuBuilder,
} = require("discord.js");

module.exports = {
  name: "interactionCreate",

  async execute(interaction, client) {
    // 🔵 BUTTON CLICK
    if (interaction.isButton()) {
      if (interaction.customId === "notification_roles") {
        const menu = new StringSelectMenuBuilder()
          .setCustomId("notification_select")
          .setPlaceholder("Select your notification roles")
          .setMinValues(1)
          .setMaxValues(5)
          .addOptions([
            {
              label: "Development Notices",
              value: "dev",
            },
            {
              label: "Activity Notices",
              value: "activity",
            },
            {
              label: "Affiliate Notices",
              value: "affiliate",
            },
            {
              label: "Event Notices",
              value: "event",
            },
            {
              label: "Session Notices",
              value: "session",
            },
          ]);

        const row = new ActionRowBuilder().addComponents(menu);

        return interaction.reply({
          content: "Select your notification roles:",
          components: [row],
          ephemeral: true,
        });
      }

      if (interaction.customId === "pronoun_roles") {
        const menu = new StringSelectMenuBuilder()
          .setCustomId("pronoun_select")
          .setPlaceholder("Select your pronoun roles")
          .setMinValues(1)
          .setMaxValues(3)
          .addOptions([
            {
              label: "He/Him",
              value: "he_him",
            },
            {
              label: "She/Her",
              value: "she_her",
            },
            {
              label: "They/Them",
              value: "they_them",
            },
            {
              label: "Other",
              value: "other",
            },
          ]);

        const row = new ActionRowBuilder().addComponents(menu);

        return interaction.reply({
          content: "Select your pronoun roles:",
          components: [row],
          ephemeral: true,
        });
      }
    }

    // 🟢 DROPDOWN SELECT
    if (interaction.isStringSelectMenu()) {
      const member = interaction.member;

      if (interaction.customId === "notification_select") {
        const rolesMap = {
          dev: "1121978087459008622",
          activity: "988867183364939806",
          affiliate: "1121978081075269643",
          event: "1121978085051469824",
          session: "1401120851528781894",
        };

        for (const value of interaction.values) {
          const roleId = rolesMap[value];
          if (!roleId) continue;

          if (member.roles.cache.has(roleId)) {
            await member.roles.remove(roleId);
          } else {
            await member.roles.add(roleId);
          }
        }

        return interaction.reply({
          content: "🌺 Your notification roles have been updated.",
          ephemeral: true,
        });
      }

      if (interaction.customId === "pronoun_select") {
        const rolesMap = {
          he_him: "1401121179049132042",
          she_her: "1401121094773244016",
          they_them: "1401121273685475461",
          other: "1401121409790640188",
        };

        for (const value of interaction.values) {
          const roleId = rolesMap[value];
          if (!roleId) continue;

          if (member.roles.cache.has(roleId)) {
            await member.roles.remove(roleId);
          } else {
            await member.roles.add(roleId);
          }
        }

        return interaction.reply({
          content: "🌸 Your pronoun roles have been updated.",
          ephemeral: true,
        });
      }
    }
  },
};