// src/index.js
require("dotenv").config();

const {
  Client,
  GatewayIntentBits,
  Partials,
  Collection,
  REST,
  Routes,
  EmbedBuilder,
} = require("discord.js");
const fs = require("fs");
const path = require("path");
const { MongoClient } = require("mongodb");
const crypto = require("crypto");
const express = require("express");
const cookieParser = require("cookie-parser");
const axios = require("axios");

// Optional crash logging
process.on("unhandledRejection", (r) => console.error("UnhandledRejection:", r));
process.on("uncaughtException", (e) => console.error("UncaughtException:", e));

const TOKEN = process.env.DISCORD_TOKEN;
const MONGO_URL = process.env.MONGO_URL;
const DB_NAME = process.env.MONGO_DB || "surfari";
const PORT = process.env.PORT || 3000;

if (!TOKEN) {
  console.error("❌ DISCORD_TOKEN missing");
  process.exit(1);
}

if (!MONGO_URL) {
  console.error("❌ MONGO_URL missing");
  process.exit(1);
}

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessageReactions,
    GatewayIntentBits.DirectMessages,
  ],
  partials: [
    Partials.Message,
    Partials.Channel,
    Partials.Reaction,
    Partials.GuildMember,
    Partials.User,
  ],
});

client.commands = new Collection();
client.reactionRoles = new Map();

const pendingVerifications = new Map();

const app = express();
app.use(cookieParser());

const ROOT = __dirname;
const COMMANDS_DIR = path.join(ROOT, "commands");
const EVENTS_DIR = path.join(ROOT, "events");

const roleMap = {
  Customer: "111111111111111111",
  Trainee: "222222222222222222",
  Barista: "333333333333333333",
  Supervisor: "444444444444444444",
  Management: "555555555555555555",
};

function base64UrlEncode(buffer) {
  return buffer
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

async function removeMappedRoles(member) {
  const roleIds = Object.values(roleMap);
  const toRemove = member.roles.cache.filter((role) => roleIds.includes(role.id));
  if (toRemove.size > 0) {
    await member.roles.remove(toRemove.map((role) => role.id)).catch(() => {});
  }
}

function loadEvents(dir) {
  if (!fs.existsSync(dir)) return;

  const files = fs.readdirSync(dir).filter((f) => f.endsWith(".js"));

  for (const file of files) {
    const ev = require(path.join(dir, file));

    if (!ev?.name || typeof ev.execute !== "function") {
      console.warn(`⚠️ Skipping event ${file} (missing name/execute)`);
      continue;
    }

    if (ev.once) {
      client.once(ev.name, (...args) => ev.execute(...args, client));
    } else {
      client.on(ev.name, (...args) => ev.execute(...args, client));
    }

    console.log(`✅ Event loaded: ${ev.name}`);
  }
}

function loadCommands(dir) {
  if (!fs.existsSync(dir)) return;

  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    if (entry.isDirectory()) {
      const sub = path.join(dir, entry.name);
      const files = fs.readdirSync(sub).filter((f) => f.endsWith(".js"));

      for (const file of files) {
        const cmd = require(path.join(sub, file));

        if (!cmd?.data?.name || typeof cmd.execute !== "function") {
          console.warn(`⚠️ Skipping command ${entry.name}/${file}`);
          continue;
        }

        client.commands.set(cmd.data.name, cmd);
        console.log(`✅ Command loaded: ${cmd.data.name}`);
      }
    } else if (entry.isFile() && entry.name.endsWith(".js")) {
      const cmd = require(path.join(dir, entry.name));

      if (!cmd?.data?.name || typeof cmd.execute !== "function") {
        console.warn(`⚠️ Skipping command ${entry.name}`);
        continue;
      }

      client.commands.set(cmd.data.name, cmd);
      console.log(`✅ Command loaded: ${cmd.data.name}`);
    }
  }
}

async function registerGuildCommands() {
  const CLIENT_ID = process.env.DISCORD_CLIENT_ID;
  const GUILD_ID = process.env.GUILD_ID;

  if (!CLIENT_ID || !GUILD_ID) {
    console.error("❌ Missing DISCORD_CLIENT_ID or GUILD_ID for command registration");
    return;
  }

  const rest = new REST({ version: "10" }).setToken(TOKEN);
  const body = [...client.commands.values()].map((c) => c.data.toJSON());

  console.log(`📝 Registering ${body.length} guild commands to ${GUILD_ID}...`);
  await rest.put(Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID), { body });
  console.log("✅ Guild commands registered.");
}

// --------------------
// Express routes
// --------------------

app.get("/", (_req, res) => {
  res.send("Verification backend is running.");
});

app.get("/health", (_req, res) => {
  res.json({ ok: true });
});

app.get("/verify/start", async (req, res) => {
  try {
    const { token } = req.query;
    if (!token) return res.status(400).send("Missing token.");

    const pending = pendingVerifications.get(token);
    if (!pending) return res.status(400).send("Invalid or expired token.");

    const state = crypto.randomBytes(24).toString("hex");
    const codeVerifier = base64UrlEncode(crypto.randomBytes(32));
    const codeChallenge = base64UrlEncode(
      crypto.createHash("sha256").update(codeVerifier).digest()
    );

    res.cookie("verify_token", token, {
      httpOnly: true,
      sameSite: "lax",
      secure: true,
    });

    res.cookie("oauth_state", state, {
      httpOnly: true,
      sameSite: "lax",
      secure: true,
    });

    res.cookie("code_verifier", codeVerifier, {
      httpOnly: true,
      sameSite: "lax",
      secure: true,
    });

    const params = new URLSearchParams({
      client_id: process.env.ROBLOX_CLIENT_ID,
      redirect_uri: process.env.ROBLOX_REDIRECT_URI,
      response_type: "code",
      scope: "openid profile",
      state,
      code_challenge: codeChallenge,
      code_challenge_method: "S256",
    });

    const authUrl = `https://apis.roblox.com/oauth/v1/authorize?${params.toString()}`;
    return res.redirect(authUrl);
  } catch (err) {
    console.error("verify/start error:", err);
    return res.status(500).send("Failed to start verification.");
  }
});

app.get("/auth/callback", async (req, res) => {
  try {
    const { code, state } = req.query;

    const savedState = req.cookies.oauth_state;
    const verifyToken = req.cookies.verify_token;
    const codeVerifier = req.cookies.code_verifier;

    if (!code || !state) {
      return res.status(400).send("Missing code or state.");
    }

    if (!savedState || state !== savedState) {
      return res.status(400).send("Invalid OAuth state.");
    }

    const pending = pendingVerifications.get(verifyToken);
    if (!pending) {
      return res.status(400).send("Verification expired or invalid.");
    }

    const tokenRes = await axios.post(
      "https://apis.roblox.com/oauth/v1/token",
      new URLSearchParams({
        grant_type: "authorization_code",
        code,
        client_id: process.env.ROBLOX_CLIENT_ID,
        client_secret: process.env.ROBLOX_CLIENT_SECRET,
        redirect_uri: process.env.ROBLOX_REDIRECT_URI,
        code_verifier: codeVerifier,
      }).toString(),
      {
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
      }
    );

    const accessToken = tokenRes.data.access_token;
    if (!accessToken) {
      return res.status(400).send("No access token returned.");
    }

    const userRes = await axios.get("https://apis.roblox.com/oauth/v1/userinfo", {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    const robloxUser = userRes.data;
    const robloxUserId = robloxUser.sub;
    const robloxUsername =
      robloxUser.preferred_username || robloxUser.name || "Roblox User";

    const groupsRes = await axios.get(
      `https://groups.roblox.com/v2/users/${robloxUserId}/groups/roles`
    );

    const groupEntry = groupsRes.data.data.find(
      (g) => String(g.group.id) === String(process.env.ROBLOX_GROUP_ID)
    );

    if (!groupEntry) {
      return res.status(403).send("You are not in the Roblox group.");
    }

    const robloxRoleName = groupEntry.role.name;

    const guild = await client.guilds.fetch(pending.guildId);
    const member = await guild.members.fetch(pending.discordUserId);

    await removeMappedRoles(member);
    await member.roles.add(process.env.VERIFIED_ROLE_ID).catch(() => {});

    const mappedDiscordRoleId = roleMap[robloxRoleName];
    if (mappedDiscordRoleId) {
      await member.roles.add(mappedDiscordRoleId).catch(() => {});
    }

    await member.setNickname(robloxUsername).catch(() => {});

    pendingVerifications.delete(verifyToken);

    res.clearCookie("verify_token");
    res.clearCookie("oauth_state");
    res.clearCookie("code_verifier");

    return res.send(`
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Flourai Verification Complete</title>
  <style>
    * {
      box-sizing: border-box;
    }

    body {
      margin: 0;
      min-height: 100vh;
      font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      background:
        radial-gradient(circle at top, rgba(255, 153, 204, 0.16), transparent 35%),
        linear-gradient(180deg, #0f0f16 0%, #141421 100%);
      color: #f7f2f5;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 24px;
    }

    .card {
      width: 100%;
      max-width: 560px;
      background: rgba(24, 24, 36, 0.88);
      border: 1px solid rgba(255, 183, 212, 0.2);
      border-radius: 24px;
      padding: 36px 30px;
      text-align: center;
      box-shadow:
        0 20px 60px rgba(0, 0, 0, 0.45),
        0 0 40px rgba(255, 150, 200, 0.08);
      backdrop-filter: blur(14px);
    }

    .icon {
      width: 82px;
      height: 82px;
      margin: 0 auto 18px;
      border-radius: 999px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 36px;
      background: linear-gradient(135deg, rgba(255, 168, 213, 0.22), rgba(255, 214, 232, 0.08));
      border: 1px solid rgba(255, 190, 220, 0.28);
      box-shadow: 0 0 30px rgba(255, 160, 210, 0.12);
    }

    .eyebrow {
      display: inline-block;
      margin-bottom: 12px;
      padding: 6px 12px;
      border-radius: 999px;
      font-size: 12px;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      color: #ffd8ea;
      background: rgba(255, 182, 219, 0.1);
      border: 1px solid rgba(255, 182, 219, 0.16);
    }

    h1 {
      margin: 0 0 10px;
      font-size: 32px;
      line-height: 1.1;
      color: #fff4fa;
    }

    p {
      margin: 0;
      color: #d7cfda;
      font-size: 16px;
      line-height: 1.7;
    }

    .user {
      margin-top: 20px;
      padding: 16px 18px;
      border-radius: 18px;
      background: rgba(255, 255, 255, 0.03);
      border: 1px solid rgba(255, 190, 220, 0.12);
      color: #fff;
      font-size: 15px;
    }

    .username {
      color: #ffc3df;
      font-weight: 700;
    }

    .actions {
      margin-top: 24px;
      display: flex;
      justify-content: center;
      gap: 12px;
      flex-wrap: wrap;
    }

    .btn {
      text-decoration: none;
      border: none;
      border-radius: 14px;
      padding: 12px 18px;
      font-size: 14px;
      font-weight: 600;
      cursor: pointer;
      transition: 0.2s ease;
    }

    .btn-primary {
      background: linear-gradient(135deg, #ffb6d9, #ff8fc2);
      color: #24151d;
      box-shadow: 0 10px 24px rgba(255, 143, 194, 0.2);
    }

    .btn-primary:hover {
      transform: translateY(-1px);
      filter: brightness(1.03);
    }

    .btn-secondary {
      background: rgba(255, 255, 255, 0.04);
      color: #f8edf3;
      border: 1px solid rgba(255, 190, 220, 0.14);
    }

    .btn-secondary:hover {
      background: rgba(255, 255, 255, 0.07);
    }

    .footer {
      margin-top: 22px;
      font-size: 13px;
      color: #a99daa;
    }
  </style>
</head>
<body>
  <div class="card">
    <div class="icon">🌸</div>
    <div class="eyebrow">Flourai Verification</div>
    <h1>Verification Complete</h1>
    <p>Your Discord account has been successfully linked and updated.</p>

    <div class="user">
      Verified as <span class="username">${robloxUsername}</span>
    </div>

    <div class="actions">
      <a class="btn btn-primary" href="discord://-/channels/@me">Return to Discord</a>
      <button class="btn btn-secondary" onclick="window.close()">Close Page</button>
    </div>

    <div class="footer">
      You can safely return to Discord now.
    </div>
  </div>
</body>
</html>
`);
  } catch (err) {
    console.error("OAuth callback error:", err.response?.data || err.message);
    return res.status(500).send("Verification failed.");
  }
});

// --------------------
// Discord events
// --------------------

client.once("ready", async () => {
  console.log(`🤖 Logged in as ${client.user.tag}`);

  try {
    await registerGuildCommands();
  } catch (e) {
    console.error("Command registration failed:", e);
  }

  try {
    const channel = await client.channels.fetch(process.env.VERIFY_CHANNEL_ID);
    const message = await channel.messages.fetch(process.env.VERIFY_MESSAGE_ID);

    await message.react("🌺");
    console.log("Reaction added to verification message.");
  } catch (err) {
    console.error("Failed to add verification reaction:", err);
  }
});

client.on("guildMemberAdd", async (member) => {
  const channel = member.guild.channels.cache.get("1401111488759861319");
  if (!channel) return;

  const welcomeEmbed = new EmbedBuilder()
    .setColor("#F5E6EA")
    .setTitle("🌺 Welcome to Flourai")
    .setDescription(
      `Greetings, <@${member.id}>! Welcome to Flourai's official discord server. Flourai is a renowned Roblox group committed to providing exceptional, high-quality services, including fragrant flowers, indulgent teas, and breathtaking features. Our passionate team strives to create immersive and unforgettable experiences that captivate and delight our audience.`
    )
    .setImage(
      "https://cdn.discordapp.com/attachments/1330406002688000085/1337683299065135205/2.png?ex=69c23a27&is=69c0e8a7&hm=fdd33d0bf0a649b5f199a99c60138212cee5dcc61df61eb671689462fcb8dce9"
    )
    .setFooter({
      text: "Flourai.io · 2026",
      iconURL: "https://imgur.com/jiu0zEe.png",
    })
    .setTimestamp();

  await channel.send({ embeds: [welcomeEmbed] });
});

client.on("messageReactionAdd", async (reaction, user) => {
  try {
    if (user.bot) return;

    if (reaction.partial) await reaction.fetch();
    if (reaction.message.partial) await reaction.message.fetch();

    if (reaction.message.id !== process.env.VERIFY_MESSAGE_ID) return;
    if (reaction.emoji.name !== "🌺") return;

    await reaction.users.remove(user.id).catch(() => {});

    const token = crypto.randomBytes(24).toString("hex");

    pendingVerifications.set(token, {
      discordUserId: user.id,
      guildId: reaction.message.guild.id,
      createdAt: Date.now(),
    });

    const verifyUrl = `${process.env.BASE_URL}/verify/start?token=${token}`;

    await user.send(`🌸 Click the link below to verify with Roblox\n\n### • [LINK](<${verifyUrl}>)`);
    console.log(`Sent verification link to ${user.tag}`);
  } catch (err) {
    console.error("Reaction verify error:", err);

    try {
      const member = await reaction.message.guild.members.fetch(user.id);
      await reaction.message.channel.send(
        `${member}, I couldn't DM you. Please enable Direct Messages and react again.`
      );
    } catch (e) {
      console.error("Fallback message failed:", e);
    }
  }
});

// --------------------
// Startup
// --------------------

(async () => {
  console.log("📦 Connecting to Mongo…");
  const mongo = await MongoClient.connect(MONGO_URL);
  const db = mongo.db(DB_NAME);
  client.db = db;

  console.log("✅ Mongo connected. DB:", DB_NAME);

  global._surfariDb = db;
  console.log("🔌 Global _surfariDb set:", !!global._surfariDb);

  loadEvents(EVENTS_DIR);
  loadCommands(COMMANDS_DIR);

  app.listen(PORT, () => {
    console.log(`🌐 Backend running on :${PORT}`);
  });

  await client.login(TOKEN);
})().catch((err) => {
  console.error("Startup error:", err);
  process.exit(1);
});