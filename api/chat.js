// api/chat.js
import OpenAI from "openai";

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// 👇 هنا الـ Prompt ID تبعك
const PROMPT_ID = "pmpt_694b5921afa48194a3afd294ebf57e21005f4481712d1d3a";

export default async function handler(req, res) {
  // CORS يسمح للواجهة (Figma / الموقع) تتصل بالباكند
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  // Preflight
  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  // فقط POST مسموح
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const body = req.body || {};
    const { messages } = body;

    // لازم يكون في messages من الواجهة
    if (!Array.isArray(messages) || messages.length === 0) {
      return res
        .status(400)
        .json({ error: "messages array is required in request body" });
    }

    // استدعاء OpenAI Responses مع الـ Prompt ID
    const response = await client.responses.create({
      prompt: {
        id: PROMPT_ID,
        version: "1",
      },
      input: messages,
    });

    // استخراج النص من الـ response
    const replyText =
      response.output?.[0]?.content?.[0]?.text ??
      response.output_text ??
      null;

    if (!replyText) {
      throw new Error("No text output returned from OpenAI Responses API");
    }

    // نفس الشكل اللي فيجما متوقعه
    return res.status(200).json({ reply: replyText });
  } catch (error) {
    console.error("Verse AI backend error:", error);
    // مؤقتًا بنرجّع التفاصيل عشان نعرف الخطأ لو استمر
    return res.status(500).json({
      error: "Internal server error",
      details: String(error?.message || error),
    });
  }
}
