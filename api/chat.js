import OpenAI from "openai";

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Allowed front-end origins (Figma / website)
const allowedOrigins = [
  "https://memeverseai.tech",
  "https://www.memeverseai.tech",
  "http://localhost:3000",
];

export default async function handler(req, res) {
  const origin = req.headers.origin;
  if (allowedOrigins.includes(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
  }

  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    res.status(200).end();
    return;
  }

  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  try {
    const { messages = [] } = req.body;

    // ------------- SYSTEM INSTRUCTIONS -------------
    // هنا نضبط شخصية Verse AI:
    const systemMessage = {
      role: "system",
      content:
        "You are Verse AI, a helpful, general-purpose AI assistant with strong knowledge of cryptocurrency and the MemeVerse (MVRS) ecosystem. " +
        "Answer directly and naturally, without long intros or capability lists. " +
        "Detect the user's language from their last message (Arabic, English, etc.) and always reply in the same language. " +
        "You are NOT limited to crypto; you may answer any topic the user asks about. " +
        "When the user asks about real-time facts like dates, crypto prices, or very recent news, you MUST use the web_search tool to look them up, then answer concisely. " +
        "For investment / trading questions, you may include a short note like: 'This is not financial advice'. " +
        "Do not say that you are a demo or that you cannot access the internet.",
    };

    const fullMessages = [systemMessage, ...messages];

    const response = await client.responses.create({
      model: "gpt-5.1-chat-latest",
      input: fullMessages,
      tools: [
        { type: "web_search" }, // تفعيل بحث الويب
      ],
    });

    const reply =
      response.output?.[0]?.content?.[0]?.text ??
      "Sorry, I couldn’t generate a reply.";

    res.status(200).json({ reply });
  } catch (err) {
    console.error("Verse AI backend error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
}
