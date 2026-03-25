const axios = require("axios");
const { ROLE_MAP } = require("../config/roles");
const { getDb } = require("../mongo"); // adjust path if needed

async function getLinkedAccount(discordId) {
  const db = getDb();
  return db.collection("verifications").findOne({ discordId });
}

async function getRobloxUser(userId) {
  const { data } = await axios.get(`https://users.roblox.com/v1/users/${userId}`);
  return data;
}

async function getRobloxGroupRole(userId, groupId) {
  const { data } = await axios.get(`https://groups.roblox.com/v2/users/${userId}/groups/roles`);
  return data.data.find(entry => String(entry.group.id) === String(groupId)) || null;
}

async function syncDiscordMember(member) {
  const linked = await getLinkedAccount(member.id);
  if (!linked) throw new Error("You are not verified yet.");

  const robloxUserId = linked.robloxUserId;
  const groupId = process.env.FLOURAI_GROUP_ID;
  const verifiedRoleId = process.env.VERIFIED_ROLE_ID;

  const [robloxUser, groupRole] = await Promise.all([
    getRobloxUser(robloxUserId),
    getRobloxGroupRole(robloxUserId, groupId),
  ]);

  const username = robloxUser.name;
  const rankName = groupRole?.role?.name || null;

  const mappedRoleIds = Object.values(ROLE_MAP);

  const oldRankRoles = member.roles.cache.filter(role => mappedRoleIds.includes(role.id));
  if (oldRankRoles.size) {
    await member.roles.remove(oldRankRoles, "Refreshing Flourai roles");
  }

  if (verifiedRoleId && !member.roles.cache.has(verifiedRoleId)) {
    await member.roles.add(verifiedRoleId, "Ensuring verified role");
  }

  let addedRole = null;
  if (rankName && ROLE_MAP[rankName]) {
    addedRole = ROLE_MAP[rankName];
    if (!member.roles.cache.has(addedRole)) {
      await member.roles.add(addedRole, "Synced Flourai group rank");
    }
  }

  if (member.manageable) {
    await member.setNickname(username).catch(() => null);
  }

  const db = getDb();
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

  return {
    username,
    rankName,
    addedRole,
  };
}

module.exports = { syncDiscordMember };