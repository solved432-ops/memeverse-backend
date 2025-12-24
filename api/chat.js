import OpenAI from "openai";

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export default async function handler(req, res) {
  // ===== CORS =====
  // هذا بالضبط ما يطلبه منك Backend Status Checker
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  // Preflight (طلبات OPTIONS)
  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  // السماح فقط بـ POST
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { messages } = req.body;

    // استدعاء OpenAI Responses API مع Prompt ID الخاص بك
    const response = await client.responses.create({
      model: "gpt-5.1-chat-latest",
      prompt: {
        id: "pmpt_6948b3a2c5888193862088da7b9b617e060ff263bcdce78a",
        version: "1",
      },
      // نرسل محادثة الفرونت كما هي
      input: messages,
    });

    const reply =
      response.output?.[0]?.content?.[0]?.text ??
      "Sorry, I couldn’t generate a reply.";

    return res.status(200).json({ reply });
  } catch (err) {
    console.error("Verse AI backend error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
}
