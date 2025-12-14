import OpenAI from "openai";

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY, // المفتاح السري هنا فقط
});

export default async function handler(req, res) {
  // السماح فقط بطلبات POST
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { messages } = req.body;

    if (!messages) {
      return res.status(400).json({ error: "Missing 'messages' in body" });
    }

    // استدعاء OpenAI Responses API
    const response = await client.responses.create({
      model: "gpt-5.1-chat-latest", // أو أي موديل آخر تريده
      input: messages,
      // تستطيع إضافة tools هنا مثل web_search إذا كنت تستخدمها
    });

    // استخراج النص من الـ response
    const output = response.output?.[0]?.content?.[0]?.text || "";

    return res.status(200).json({
      ok: true,
      text: output,
    });
  } catch (err) {
    console.error("OpenAI error:", err);
    return res.status(500).json({
      ok: false,
      error: "OpenAI request failed",
    });
  }
}
