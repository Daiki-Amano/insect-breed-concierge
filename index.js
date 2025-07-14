const express = require("express");
const bodyParser = require("body-parser");
const axios = require("axios");

const app = express();
app.use(bodyParser.json());

// 環境変数がなければ直接セット
const LINE_ACCESS_TOKEN = process.env.LINE_ACCESS_TOKEN || "0Lqu96A4fqbrOiskkT5nc0ZYMft4kI9R9zutnCDunmElqRTibGNmXFhOmSOrSbuJAtJxOfWDCWftniFeAlv4WMN/iQZ6ss3wzNyFNEtiPYQZj5qS2obo5lPVM5sbOTuHlzgAXVkkxMCjYPvEXHNGZAdB04t89/1O/w1cDnyilFU=";
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

      console.log("受信メッセージ:", userMessage);
      console.log("ユーザーID:", userId);
      console.log("replyToken:", replyToken);

      try {
        // GPTsのActionsに転送
        await axios.post(GPTS_ACTION_URL, {
          message: userMessage,
          userId: userId,
          replyToken: replyToken,
        });

        console.log("GPTS_ACTION_URL に送信成功");
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

  console.log("GPTsからの返答:", reply);
  console.log("replyToken:", replyToken);

  if (!reply || !replyToken) {
    console.error("Missing reply or replyToken:", req.body);
    return res.status(400).json({ error: "Missing reply or replyToken" });
  }

  try {
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

    console.log("LINEに返信成功");
    res.sendStatus(200);
  } catch (err) {
    console.error("LINEへの返信エラー:", err.response?.data || err.message);
    res.status(500).json({ error: "Failed to send reply to LINE" });
  }
});

app.get("/", (req, res) => res.send("LINE GPT Bot is running"));

const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`Listening on ${port}`));
