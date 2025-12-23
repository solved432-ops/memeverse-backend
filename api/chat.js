import OpenAI from "openai";

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Allowed front-end origins (Figma / website)
const allowedOrigins = [
  "https://memeverseai.tech",
  "https://www.memeverseai.tech",
  "http://localhost:3000", // for local testing
];

export default async function handler(req, res) {
  const origin = req.headers.origin || "";

  if (allowedOrigins.includes(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
  }

  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  // Preflight for CORS
  if (req.method === "OPTIONS") {
    res.status(200).end();
    return;
  }

  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  try {
    const { messages } = req.body;

    if (!Array.isArray(messages)) {
      return res.status(400).json({ error: "messages must be an array" });
    }

    // 🔹 هنا نستخدم الـ Chat Prompt من داشبورد OpenAI فقط
    const response = await client.responses.create({
      prompt: {
        id: "pmpt_6948b3a2c5888193862088da7b9b617e060ff263bcdce78a",
        version: "1",
      },
      // نرسل المحادثة كما هي للبرومبت
      input: messages,
    });

    // استخراج النص من Responses API
    const reply =
      response.output?.[0]?.content?.[0]?.text ??
      "Sorry, I couldn’t generate a reply.";

    res.status(200).json({ reply });
  } catch (err) {
    console.error("Verse AI backend error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
}
