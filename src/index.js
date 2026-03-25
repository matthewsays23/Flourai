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
  Customer: "1401731081018933278",
  BusinessPartner: "988612967622922260",
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

    :root {
      --text: #f7fff9;
      --muted: #dbf3e5;
      --card: rgba(18, 44, 34, 0.42);
      --card-border: rgba(195, 255, 214, 0.22);
      --accent: #8ff0b6;
      --accent-2: #ffd76d;
      --shadow: rgba(0, 0, 0, 0.35);
    }

    html, body {
      margin: 0;
      min-height: 100%;
      font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      color: var(--text);
      overflow: hidden;
    }

    body {
      position: relative;
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 24px;
      background:
        linear-gradient(rgba(8, 20, 16, 0.28), rgba(8, 20, 16, 0.45)),
        url("https://cdn.discordapp.com/attachments/1330406002688000085/1337683889082208276/Discord_Icon.png?ex=69c434f4&is=69c2e374&hm=c12d076e3df65c49a5126a192d6600d354dc3b200841433d97dbf9c19262e8ba&") center center / cover no-repeat;
    }

    body::before {
      content: "";
      position: absolute;
      inset: 0;
      backdrop-filter: blur(6px) saturate(1.08);
      background:
        radial-gradient(circle at 50% 30%, rgba(255, 227, 130, 0.18), transparent 28%),
        radial-gradient(circle at 20% 20%, rgba(255, 140, 190, 0.12), transparent 24%),
        radial-gradient(circle at 80% 25%, rgba(142, 255, 186, 0.14), transparent 24%),
        linear-gradient(to bottom, rgba(0,0,0,0.05), rgba(0,0,0,0.18));
      z-index: 0;
    }

    .page-glow {
      position: absolute;
      inset: 0;
      background:
        radial-gradient(circle at center, rgba(255, 241, 166, 0.12), transparent 22%),
        radial-gradient(circle at center, rgba(255, 255, 255, 0.06), transparent 38%);
      pointer-events: none;
      z-index: 0;
    }

    .card {
      position: relative;
      z-index: 1;
      width: 100%;
      max-width: 620px;
      padding: 30px;
      border-radius: 32px;
      background: var(--card);
      border: 1px solid var(--card-border);
      box-shadow:
        0 25px 70px var(--shadow),
        inset 0 1px 0 rgba(255,255,255,0.08),
        0 0 50px rgba(157, 255, 196, 0.08);
      backdrop-filter: blur(20px);
      text-align: center;
    }

    .badge {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 8px 14px;
      border-radius: 999px;
      background: rgba(255, 255, 255, 0.08);
      border: 1px solid rgba(255,255,255,0.14);
      color: #f5fff8;
      font-size: 12px;
      font-weight: 700;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      margin-bottom: 18px;
    }

    .logo-wrap {
      margin: 0 auto 18px;
      width: 118px;
      height: 118px;
      border-radius: 28px;
      display: flex;
      align-items: center;
      justify-content: center;
      background:
        radial-gradient(circle at 30% 30%, rgba(255,255,255,0.22), transparent 30%),
        linear-gradient(145deg, rgba(157,255,196,0.24), rgba(255,216,112,0.14));
      border: 1px solid rgba(255,255,255,0.18);
      box-shadow:
        0 12px 35px rgba(0,0,0,0.22),
        0 0 30px rgba(255, 225, 119, 0.10);
      overflow: hidden;
    }

    .logo-wrap img {
      width: 90px;
      height: 90px;
      object-fit: cover;
      border-radius: 22px;
      display: block;
    }

    h1 {
      margin: 0;
      font-size: clamp(2rem, 5vw, 3.1rem);
      line-height: 1.04;
      letter-spacing: -0.03em;
      color: #f7fff9;
      text-shadow: 0 3px 20px rgba(0,0,0,0.22);
    }

    .subtitle {
      margin: 14px auto 0;
      max-width: 480px;
      font-size: 16px;
      line-height: 1.7;
      color: var(--muted);
    }

    .user-box {
      margin-top: 24px;
      padding: 18px 20px;
      border-radius: 22px;
      background: rgba(255,255,255,0.07);
      border: 1px solid rgba(255,255,255,0.12);
      box-shadow: inset 0 1px 0 rgba(255,255,255,0.06);
    }

    .user-label {
      font-size: 12px;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      color: #d7ffe5;
      opacity: 0.9;
      margin-bottom: 8px;
      font-weight: 700;
    }

    .username {
      font-size: 26px;
      font-weight: 800;
      color: #ffffff;
      text-shadow: 0 2px 14px rgba(0,0,0,0.2);
    }

    .role {
      margin-top: 8px;
      font-size: 15px;
      color: #ecfff3;
      opacity: 0.92;
    }

    .role span {
      color: var(--accent-2);
      font-weight: 700;
    }

    .actions {
      margin-top: 26px;
      display: flex;
      justify-content: center;
      gap: 12px;
      flex-wrap: wrap;
    }

    .btn {
      appearance: none;
      border: none;
      text-decoration: none;
      border-radius: 16px;
      padding: 14px 18px;
      font-size: 14px;
      font-weight: 700;
      transition: transform 0.18s ease, filter 0.18s ease, background 0.18s ease;
      cursor: pointer;
      min-width: 170px;
    }

    .btn-primary {
      color: #103522;
      background: linear-gradient(135deg, #a8ffd0, #ffe282);
      box-shadow: 0 10px 26px rgba(255, 226, 130, 0.22);
    }

    .btn-primary:hover {
      transform: translateY(-2px);
      filter: brightness(1.04);
    }

    .btn-secondary {
      color: #f5fff8;
      background: rgba(255,255,255,0.08);
      border: 1px solid rgba(255,255,255,0.14);
    }

    .btn-secondary:hover {
      transform: translateY(-2px);
      background: rgba(255,255,255,0.12);
    }

    .footer {
      margin-top: 18px;
      font-size: 13px;
      color: rgba(244,255,248,0.8);
    }

    .petals {
      pointer-events: none;
      position: absolute;
      inset: 0;
      z-index: 0;
      overflow: hidden;
    }

    .petal {
      position: absolute;
      font-size: 18px;
      opacity: 0.22;
      animation: floatDown linear infinite;
    }

    .petal:nth-child(1) { left: 8%; top: -10%; animation-duration: 14s; }
    .petal:nth-child(2) { left: 22%; top: -14%; animation-duration: 18s; }
    .petal:nth-child(3) { left: 40%; top: -12%; animation-duration: 13s; }
    .petal:nth-child(4) { left: 60%; top: -15%; animation-duration: 17s; }
    .petal:nth-child(5) { left: 80%; top: -8%; animation-duration: 15s; }
    .petal:nth-child(6) { left: 92%; top: -13%; animation-duration: 19s; }

    @keyframes floatDown {
      0% {
        transform: translateY(-20px) rotate(0deg);
      }
      100% {
        transform: translateY(115vh) rotate(260deg);
      }
    }

    @media (max-width: 640px) {
      body {
        padding: 16px;
      }

      .card {
        padding: 22px 18px;
        border-radius: 24px;
      }

      .logo-wrap {
        width: 100px;
        height: 100px;
      }

      .logo-wrap img {
        width: 78px;
        height: 78px;
      }

      .username {
        font-size: 22px;
      }

      .btn {
        width: 100%;
      }
    }
  </style>
</head>
<body>
  <div class="page-glow"></div>

  <div class="petals">
    <div class="petal">🌸</div>
    <div class="petal">🌼</div>
    <div class="petal">🌸</div>
    <div class="petal">🌿</div>
    <div class="petal">🌼</div>
    <div class="petal">🌸</div>
  </div>

  <div class="card">
    <div class="badge">Flourai Verification</div>

    <div class="logo-wrap">
      <img src="https://cdn.discordapp.com/attachments/1330406002688000085/1460089463521935482/p2.png?ex=69c3e907&is=69c29787&hm=5a59856c8cea66e7f38c02b9c42455751a2bb9e0f2a0d068009c61cbbc481c12" alt="Flourai Logo" />
    </div>

    <h1>Welcome to Flourai</h1>
    <p class="subtitle">
      Your account has been successfully verified and linked to Discord.
    </p>

    <div class="user-box">
      <div class="user-label">Verified Account</div>
      <div class="username">${robloxUsername}</div>
      <div class="role">Group role: <span>${robloxRoleName}</span></div>
    </div>

    <div class="actions">
      <a class="btn btn-primary" href="discord://-/channels/@me">Return to Discord</a>
      <button class="btn btn-secondary" onclick="window.close()">Close</button>
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

    await user.send(`🌸 Click the link below to verify with Roblox!\n🔒*We do not collect or store information that is collected through ROBLOX.*\n\n### • [LINK](<${verifyUrl}>)`);
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

const PANEL_CHANNEL_ID = "1486368233765474325";
const SUPPORT_ROLE_ID = "1486172951232512072";
const PANEL_MESSAGE_ID = "1486109150399434812";

const categoryMap = {
  "📋": {
    name: "staff-management",
    label: "Staff Management",
  },
  "📱": {
    name: "public-relations",
    label: "Public Relations",
  },
  "❓": {
    name: "general-inquiries",
    label: "General Inquiries",
  },
};

client.on("messageReactionAdd", async (reaction, user) => {
  if (user.bot) return;

  try {
    if (reaction.partial) await reaction.fetch();
    if (reaction.message.partial) await reaction.message.fetch();

    if (reaction.message.id !== PANEL_MESSAGE_ID) return;

    const emoji = reaction.emoji.name;
    const selected = categoryMap[emoji];
    if (!selected) return;

    const guild = reaction.message.guild;
    const member = await guild.members.fetch(user.id);

    const existing = guild.channels.cache.find(
      (c) =>
        c.name === `${selected.name}-${user.username.toLowerCase().replace(/[^a-z0-9-]/g, "")}`
    );

    if (existing) {
      try {
        await user.send(`You already have an open ${selected.label} ticket: ${existing.name}`);
      } catch {}
      return;
    }

    const channel = await guild.channels.create({
      name: `${selected.name}-${user.username.toLowerCase().replace(/[^a-z0-9-]/g, "")}`.slice(0, 90),
      type: ChannelType.GuildText,
      permissionOverwrites: [
        {
          id: guild.roles.everyone.id,
          deny: [PermissionFlagsBits.ViewChannel],
        },
        {
          id: user.id,
          allow: [
            PermissionFlagsBits.ViewChannel,
            PermissionFlagsBits.SendMessages,
            PermissionFlagsBits.ReadMessageHistory,
            PermissionFlagsBits.AttachFiles,
          ],
        },
        {
          id: SUPPORT_ROLE_ID,
          allow: [
            PermissionFlagsBits.ViewChannel,
            PermissionFlagsBits.SendMessages,
            PermissionFlagsBits.ReadMessageHistory,
            PermissionFlagsBits.ManageMessages,
          ],
        },
      ],
    });

    const embed = new EmbedBuilder()
      .setColor("#d9b3bc")
      .setTitle(`🌸 ${selected.label} Ticket`)
      .setDescription(
        [
          `Welcome ${member}, thank you for contacting **Flourai Support**.`,
          "",
          `**Category:** ${selected.label}`,
          "",
          "**Please reply with the following:**",
          "• What you need help with",
          "• Your full reasoning / issue",
          "• Any usernames or extra details involved",
          "",
          "A staff member will assist you soon.",
        ].join("\n")
      )
      .setFooter({ text: "Flourai Assistant" });

    await channel.send({
      content: `${member} <@&${SUPPORT_ROLE_ID}>`,
      embeds: [embed],
    });

    await reaction.users.remove(user.id).catch(() => {});
  } catch (err) {
    console.error("Reaction ticket error:", err);
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