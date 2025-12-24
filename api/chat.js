import OpenAI from "openai";

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export default async function handler(req, res) {
  // CORS – افتح كل الأصول مؤقتًا للتجربة
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  // Preflight
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

    // 👇 استخدام Chat Prompt من داشبورد OpenAI
    const response = await client.responses.create({
      prompt: {
        id: "pmpt_6948b3a2c5888193862088da7b9b617e060ff263bcdce78a",
        version: "1",
      },
      input: messages, // الرسائل القادمة من Figma كما هي
    });

    // 👈 Responses API تعطيك النص النهائي في output_text
    const reply =
      response.output_text ||
      "Sorry, backend did not return any text.";

    res.status(200).json({ reply });
  } catch (err) {
    console.error("Verse AI backend error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
}
