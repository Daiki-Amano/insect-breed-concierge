const express = require("express");
const bodyParser = require("body-parser");
const axios = require("axios");

const app = express();
app.use(bodyParser.json());

const LINE_ACCESS_TOKEN = process.env.LINE_ACCESS_TOKEN;
const GPTS_ACTION_URL = process.env.GPTS_ACTION_URL;

if (!LINE_ACCESS_TOKEN) console.warn("⚠ LINE_ACCESS_TOKEN が未定義です");
if (!GPTS_ACTION_URL) console.warn("⚠ GPTS_ACTION_URL が未定義です");

// LINEからのWebhook
app.post("/webhook", async (req, res) => {
  const events = req.body.events;
  if (!events || !Array.isArray(events)) {
    return res.sendStatus(200);
  }

  for (const event of events) {
    if (event.type === "message" && event.message.type === "text") {
      const userMessage = event.message.text;
      const userId = event.source.userId;
      const replyToken = event.replyToken;

      try {
        // GPTsのActions（=GPTへの問い合わせ）
        await axios.post(GPTS_ACTION_URL, {
          message: userMessage,
          userId: userId,
          replyToken: replyToken, // GPTsが後で /reply に送る時に必要
        });
      } catch (error) {
        console.error("GPTS_ACTION_URL 呼び出しエラー:", error.response?.data || error.message);
      }
    }
  }

  res.sendStatus(200);
});

// GPTsからの返答受付
app.post("/reply", async (req, res) => {
  const { reply, replyToken } = req.body;

  if (!reply || !replyToken) {
    return res.status(400).json({ error: "Missing reply or replyToken" });
  }

  try {
    // LINEに返信
    await axios.post(
      "https://api.line.me/v2/bot/message/reply",
      {
        replyToken: replyToken,
        messages: [{ type: "text", text: reply }],
      },
      {
        headers: {
          Authorization: `Bearer ${LINE_ACCESS_TOKEN}`,
          "Content-Type": "application/json",
        },
      }
    );

    res.sendStatus(200);
  } catch (err) {
    console.error("LINEへの返信エラー:", err.response?.data || err.message);
    res.status(500).json({ error: "Failed to send reply to LINE" });
  }
});

app.get("/", (req, res) => res.send("LINE GPT Bot is running"));

const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`Listening on ${port}`));
