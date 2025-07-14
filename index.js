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
        console.error("エラー:", error.response?.data || error.mes
