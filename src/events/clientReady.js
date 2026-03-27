module.exports = {
  name: "clientReady",
  once: true,
  async execute(client) {
    console.log("🌺 Flourai Assistant is ready!");

    const statusArray = [
      {
        content: "Serving fresh tea ☕",
        type: 0, // Playing
        status: "online",
      },
      {
        content: "Blooming with Flourai 🌸",
        type: 3, // Watching
        status: "idle",
      },
      {
        content: "Managing café vibes 💐",
        type: 2, // Listening
        status: "online",
      },
    ];

    async function pickPresence() {
      const option = Math.floor(Math.random() * statusArray.length);

      try {
        await client.user.setPresence({
          activities: [
            {
              name: statusArray[option].content,
              type: statusArray[option].type,
            },
          ],
          status: statusArray[option].status,
        });
      } catch (error) {
        console.error("Presence error:", error);
      }
    }

    // ✅ Run immediately
    pickPresence();

    // 🔁 Rotate every 30 seconds
    setInterval(pickPresence, 30000);
  },
};