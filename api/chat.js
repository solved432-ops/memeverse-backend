import OpenAI from "openai";

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// السماح للواجهة (Figma / الموقع) بالاتصال عبر المتصفح
export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  // Preflight لطلبات CORS
  if (req.method === "OPTIONS") {
    res.status(200).end();
    return;
  }

  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  try {
    const { messages, feature, imageBase64, imageSize, prompt } = req.body || {};

    // ======================
    // 1) توليد الصور
    // ======================
    if (feature === "image") {
      if (!prompt) {
        return res.status(400).json({ error: "Missing prompt for image" });
      }

      const img = await client.images.generate({
        model: "gpt-image-1",
        prompt,
        size: imageSize || "1024x1024",
      });

      const url = img.data?.[0]?.url;
      if (!url) {
        return res.status(500).json({ error: "No image URL returned" });
      }

      return res.status(200).json({ reply: url, imageUrl: url });
    }

    // ======================
    // 2) تحليل الشارت (صورة)
    // ======================
    if (feature === "chart") {
      if (!imageBase64) {
        return res.status(400).json({ error: "Missing imageBase64 for chart" });
      }

      const userText =
        (messages && messages[0] && messages[0].content) ||
        "Please analyze this cryptocurrency candlestick chart.";

      const response = await client.responses.create({
        model: "gpt-4.1-mini",
        input: [
          {
            role: "user",
            content: [
              {
                type: "input_text",
                text:
                  userText +
                  "\nFocus on trend, support/resistance, and important patterns.",
              },
              {
                type: "input_image",
                image: imageBase64,
              },
            ],
          },
        ],
      });

      const analysis =
        response.output?.[0]?.content?.[0]?.text ||
        "Sorry, I couldn't analyze this chart.";

      return res.status(200).json({ reply: analysis, analysis });
    }

    // ======================
    // 3) الشات العادي
    // ======================

    const safeMessages = Array.isArray(messages) ? messages : [];

    const inputBlocks = safeMessages.map((m) => ({
      role: m.role,
      content: [
        {
          type: "input_text",
          text: m.content,
        },
      ],
    }));

    const chatResponse = await client.responses.create({
      model: "gpt-5.1-chat-latest",
      input: inputBlocks,
    });

    const reply =
      chatResponse.output?.[0]?.content?.[0]?.text ||
      "Sorry, I couldn't generate a reply.";

    return res.status(200).json({ reply });
  } catch (err) {
    console.error("Verse AI backend error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
}
