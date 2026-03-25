const crypto = require("crypto");

async function sendVerifyLink(client, user, guildId) {
  const token = crypto.randomBytes(24).toString("hex");

  client.pendingVerifications.set(token, {
    discordUserId: user.id,
    guildId,
    createdAt: Date.now(),
  });

  const verifyUrl = `${process.env.BASE_URL}/verify/start?token=${token}`;

  await user.send(
    `🌸 Click the link below to verify with Roblox!\n🔒*We do not collect or store information that is collected through ROBLOX.*\n\n### • [LINK](<${verifyUrl}>)`
  );

  console.log("verify token created:", token);
  console.log("pending size:", client.pendingVerifications.size);

  return token;
}

module.exports = { sendVerifyLink };