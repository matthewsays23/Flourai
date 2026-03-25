const crypto = require("crypto");

async function sendVerifyLink(client, user, guildId) {
  if (!client) {
    throw new Error("sendVerifyLink: client is undefined");
  }

  if (!client.db) {
    throw new Error("sendVerifyLink: client.db is undefined");
  }

  const token = crypto.randomBytes(24).toString("hex");

  await client.db.collection("pendingVerifications").insertOne({
    token,
    discordUserId: user.id,
    guildId,
    createdAt: new Date(),
  });

  const verifyUrl = `${process.env.BASE_URL}/verify/start?token=${token}`;

  await user.send(
    `🌸 Click the link below to verify with Roblox!\n🔒 *We do not collect or store information that is collected through ROBLOX.*\n\n### • [LINK](<${verifyUrl}>)`
  );

  console.log("verify token created:", token);

  return token;
}

module.exports = { sendVerifyLink };