const express = require("express");
const bodyParser = require("body-parser");
const axios = require("axios");

const app = express();
app.use(bodyParser.json());

const LINE_ACCESS_TOKEN = process.env.LINE_ACCESS_TOKEN;
const GPTS_ACTION_URL = process.env.GPTS_ACTION_URL;

if (!LINE_ACCESS_TOKEN) console.warn("⚠ LINE_ACCESS_TOKEN が未定義です");
if (!GPTS_ACTION_URL) console.warn("⚠ GPTS_ACTION_URL が未定義です");

// ✅ LINEのWebhookエンドポイント
app.post("/webhook", async (req, res) => {
  const events = req.body.events;
  if (!events || !Array.isArray(events)) {
    return res.sendStatus(200);
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
            },
          }
        );
      } catch (error) {
        console.error("エラー:", error.response?.data || error.message);
      }
    }
  }

  res.sendStatus(200);
});

// ✅ GPTsのActionsから呼ばれるPOST /
app.post("/", async (req, res) => {
  try {
    const { message, userId } = req.body;

    if (!message || !userId) {
      console.error("Missing message or userId in request body:", req.body);
      return res.status(400).json({ error: "Missing message or userId" });
    }

    const reply = `こんにちは ${userId} さん。「${message}」と受け取りました。`;

    res.json({ reply });
  } catch (err) {
    console.error("POST / でのエラー:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ✅ 動作確認用
app.get("/", (req, res) => res.send("LINE GPT Bot is running"));

const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`Listening on ${port}`));
