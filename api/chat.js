import OpenAI from "openai";

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Chat Prompt ID من لوحة OpenAI
const PROMPT_ID = "pmpt_6948b3a2c5888193862088da7b9b617e060ff263bcdce78a";

export default async function handler(req, res) {
  // CORS – خليه مفتوح لكل المواقع (تقدر تشدده لاحقاً)
  res.setHeader("Access-Control-Allow-Origin", "*");
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
    const {
      messages = [],
      feature,        // "chat" | "image" | "chart"
      imageBase64,
      imageSize,
      prompt,
    } = req.body || {};

    //
    // 🎨 1) IMAGE GENERATION (feature === "image")
    //
    if (feature === "image") {
      const finalPrompt =
        prompt ||
        messages[messages.length - 1]?.content ||
        "Generate a meme-style image for crypto.";

      // حجم الصورة من Figma أو افتراضي
      const size = imageSize || "1024x1024";

      const imgResponse = await client.images.generate({
        model: "gpt-image-1",
        prompt: finalPrompt,
        n: 1,
        size: size,
      });

      const imageUrl = imgResponse.data?.[0]?.url;

      if (!imageUrl) {
        throw new Error("No image URL returned from OpenAI");
      }

      res.status(200).json({ imageUrl });
      return;
    }

    //
    // 📈 2) CHART ANALYZER (feature === "chart")
    //
    let inputBlocks;

    if (feature === "chart") {
      const userText =
        messages[0]?.content ||
        "Please analyze this cryptocurrency candlestick chart.";

      const content = [
        { type: "input_text", text: userText },
      ];

      // نضيف الصورة لو موجودة (Base64 من Figma)
      if (imageBase64) {
        content.push({
          type: "input_image",
          image_url: `data:image/png;base64,${imageBase64}`,
        });
      }

      inputBlocks = [
        {
          role: "user",
          content,
        },
      ];
    } else {
      //
      // 💬 3) NORMAL CHAT (feature === "chat" أو undefined)
      //
      inputBlocks = messages.map((m) => ({
        role: m.role,
        content: [
          {
            type: "input_text",
            text: m.content,
          },
        ],
      }));
    }

    //
    // 🧠 استدعاء Responses API مع الـ Chat Prompt ID
    //
    const response = await client.responses.create({
      model: "gpt-4.1-mini",
      prompt: {
        id: PROMPT_ID,
        version: "1",
      },
      input: inputBlocks,
    });

    // نحاول نقرأ النص من output_text (الطريقة الرسمية)
    let reply = "";

    if (response.output_text) {
      if (Array.isArray(response.output_text)) {
        reply = response.output_text.join("\n");
      } else {
        reply = response.output_text;
      }
    }

    // احتياط: لو ما في output_text نحاول من output[0].content[]
    if (!reply && response.output?.length) {
      const blocks = response.output[0].content || [];
      const textBlocks = blocks.filter(
        (b) => b.type === "output_text" && b.text
      );

      if (textBlocks.length) {
        reply = textBlocks
          .map((b) =>
            typeof b.text === "string" ? b.text : b.text.value || ""
          )
          .join("\n");
      }
    }

    if (!reply) {
      reply = "Sorry, I couldn’t generate a reply.";
    }

    // الشات + تحليل الشارت يرجعوا في نفس الحقل reply
    res.status(200).json({ reply });
  } catch (err) {
    console.error("Verse AI backend error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
}
