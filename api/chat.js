import OpenAI from "openai";

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// CORS – اسمح لكل المصادر (أسهل شيء لفجما والويب)
export default async function handler(req, res) {
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
    const {
      messages = [],
      feature,
      imageBase64,
      prompt,
      imageSize,
      pair,
      timeframe,
    } = req.body || {};

    /***********************
     * 1) IMAGE GENERATION *
     ***********************/
    if (feature === "image") {
      if (!prompt) {
        return res.status(400).json({ error: "Missing image prompt" });
      }

      const size = imageSize || "1024x1024";

      const img = await client.images.generate({
        model: "gpt-image-1",
        prompt,
        n: 1,
        size: size,
        response_format: "url",
      });

      const imageUrl = img.data?.[0]?.url;

      if (!imageUrl) {
        throw new Error("No image URL from OpenAI");
      }

      // Frontend يتوقع imageUrl أو reply
      return res.status(200).json({ imageUrl });
    }

    /************************
     * 2) CHART ANALYZER    *
     ************************/
    if (feature === "chart") {
      if (!imageBase64) {
        return res.status(400).json({ error: "Missing chart imageBase64" });
      }

      const userQuestion =
        messages[messages.length - 1]?.content ||
        "Please analyze this cryptocurrency candlestick chart.";

      const systemText =
        "You are a crypto trading educator. Analyze candlestick charts in a clear, educational way. " +
        "Explain trend, key patterns, support/resistance, and volume/momentum. " +
        "Do NOT give financial advice or buy/sell signals.";

      const chartResponse = await client.responses.create({
        model: "gpt-4.1-mini",
        input: [
          {
            role: "system",
            content: [
              {
                type: "input_text",
                text: systemText,
              },
            ],
          },
          {
            role: "user",
            content: [
              {
                type: "input_text",
                text:
                  `${userQuestion}\n\n` +
                  (pair ? `Trading pair: ${pair}. ` : "") +
                  (timeframe ? `Timeframe: ${timeframe}.` : ""),
              },
              {
                type: "input_image",
                image_url: {
                  // صورة قادمة من فجما base64
                  url: `data:image/png;base64,${imageBase64}`,
                },
              },
            ],
          },
        ],
      });

      const analysis =
        chartResponse.output?.[0]?.content?.[0]?.text ??
        "I couldn't read this chart clearly. Please try another screenshot.";

      return res.status(200).json({ reply: analysis });
    }

    /***********************
     * 3) NORMAL CHAT       *
     ***********************/
    const response = await client.responses.create({
      model: "gpt-5.1-chat-latest",
      // ✅ استخدام Prompt ID الخاص فيك
      prompt: {
        id: "pmpt_6948b3a2c5888193862088da7b9b617e060ff263bcdce78a",
        version: "1",
      },
      input: messages,
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
