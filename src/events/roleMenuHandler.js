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
          .addOptions([
            {
              label: "Development Notices",
              value: "dev",
            },
            {
              label: "Announcements",
              value: "announcements",
            },
            {
              label: "Giveaways",
              value: "giveaways",
            },
          ]);

        const row = new ActionRowBuilder().addComponents(menu);

        return interaction.reply({
          content: "Select your notification roles:",
          components: [row],
          ephemeral: true,
        });
      }
    }

    // 🟢 DROPDOWN SELECT
    if (interaction.isStringSelectMenu()) {

      if (interaction.customId === "notification_select") {

        const rolesMap = {
          dev: "1121978087459008622", // YOUR ROLE
          announcements: "ROLE_ID_HERE",
          giveaways: "ROLE_ID_HERE",
        };

        const member = interaction.member;

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
          content: "🌺 Your roles have been updated.",
          ephemeral: true,
        });
      }
    }
  },
};