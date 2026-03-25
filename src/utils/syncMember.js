const axios = require("axios");
const { ROLE_MAP } = require("../config/roles");

async function syncDiscordMember(member) {
  const db = member.client.db;

  const linked = await db.collection("verifications").findOne({
    discordId: member.id,
  });

  if (!linked) {
    throw new Error("You are not verified yet.");
  }

  const robloxUserId = linked.robloxUserId;

  const [userRes, groupsRes] = await Promise.all([
    axios.get(`https://users.roblox.com/v1/users/${robloxUserId}`),
    axios.get(`https://groups.roblox.com/v2/users/${robloxUserId}/groups/roles`),
  ]);

  const username = userRes.data.name;

  const groupEntry = groupsRes.data.data.find(
    (g) => String(g.group.id) === String(process.env.ROBLOX_GROUP_ID)
  );

  const rankName = groupEntry?.role?.name || null;

  const mappedRoleIds = Object.values(ROLE_MAP);
  const oldRoles = member.roles.cache.filter((role) =>
    mappedRoleIds.includes(role.id)
  );

  if (oldRoles.size) {
    await member.roles.remove(oldRoles.map((r) => r.id)).catch(() => {});
  }

  await member.roles.add(process.env.VERIFIED_ROLE_ID).catch(() => {});

  const newRoleId = rankName ? ROLE_MAP[rankName] : null;
  if (newRoleId) {
    await member.roles.add(newRoleId).catch(() => {});
  }

  await member.setNickname(username).catch(() => {});

  await db.collection("verifications").updateOne(
    { discordId: member.id },
    {
      $set: {
        robloxUserId,
        robloxUsername: username,
        robloxRankName: rankName,
        lastSyncedAt: new Date(),
      },
    }
  );

  return { username, rankName };
}

module.exports = { syncDiscordMember };