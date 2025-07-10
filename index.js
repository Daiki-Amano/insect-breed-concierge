app.post("/webhook", async (req, res) => {
  const events = req.body.events;
  if (!events || !Array.isArray(events)) {
    return res.sendStatus(200); // 空イベントは何もせず返す
  }

  for (const event of events) {
    if (event.type === "message" && event.message.type === "text") {
      const userMessage = event.message.text;

      try {
        const gptRes = await axios.post(GPTS_ACTION_URL, {
          message: userMessage,
          userId: event.source.userId,
        });

        const reply = gptRes.data.reply || "すみません、うまく返せませんでした。";

        await axios.post(
          "https://api.line.me/v2/bot/message/reply",
          {
            replyToken: event.replyToken,
            messages: [{ type: "text", text: reply }],
          },
          {
            headers: {
              Authorization: `Bearer ${LINE_ACCESS_TOKEN}`,
              "Content-Type": "application/json",
            }
          }
        );
      } catch (error) {
        console.error("エラー:", error.response?.data || error.message);
      }
    }
  }

  res.sendStatus(200);
});
