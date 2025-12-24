import OpenAI from "openai";

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// لو بدك تضيف Origins معينة فقط، احذف * وحط اللي بدك إياه
const allowedOrigins = [
  "https://memeverseai.tech",
  "https://www.memeverseai.tech",
  "http://localhost:3000",
];

function setCorsHeaders(req, res) {
  const origin = req.headers.origin;

  if (allowedOrigins.includes(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
  } else {
    // أثناء التجارب ممكن نسمح للجميع، لو حابب أحذف السطر الجاي لاحقاً
    res.setHeader("Access-Control-Allow-Origin", "*");
  }

  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
}

function convertMessagesToResponsesInput(messages = []) {
  // Figma يرسل { role: "user", content: "text" }
  // Responses API يحبه بصيغة content: [{ type: "input_text", text: "..." }]
  return messages.map((m) => ({
    role: m.role,
    content: [
      {
        type: "input_text",
        text: m.content ?? "",
      },
    ],
  }));
}

export default async function handler(req, res) {
  setCorsHeaders(req, res);

  // Preflight
  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const {
      messages = [],
      feature,
      imageSize,
      prompt,        // نص برومبت الصورة
      imageBase64,   // للشارت (لاحقاً)
      pair,
      timeframe,
    } = req.body || {};

    //
    // 1) توليد الصور
    //
    if (feature === "image") {
      if (!prompt) {
        return res.status(400).json({ error: "Missing image prompt" });
      }

      const size = imageSize || "1024x1024";

      const img = await client.images.generate({
        model: "gpt-image-1",
        prompt,
        size,
      });

      const url = img.data?.[0]?.url;

      if (!url) {
        throw new Error("No image URL returned from OpenAI");
      }

      return res.status(200).json({ reply: url, imageUrl: url });
    }

    //
    // 2) تحليل الشارت (حالياً تعليمـي مبسّط – لا يعتمد على الصورة نفسها)
    //
    if (feature === "chart") {
      const userMessage =
        messages[messages.length - 1]?.content ||
        "Please analyze this crypto candlestick chart.";

      const inputForResponses = convertMessagesToResponsesInput([
        {
          role: "system",
          content:
            "You are a helpful crypto technical analysis tutor. Explain the chart in simple, educational language. No financial advice.",
        },
        {
          role: "user",
          content: `${userMessage}\nPair: ${pair || "N/A"}\nTimeframe: ${
            timeframe || "N/A"
          }`,
        },
      ]);

      const response = await client.responses.create({
        model: "gpt-5.1-chat-latest",
        prompt: {
          id: "pmpt_694b5921afa48194a3afd294ebf57e21005f4481712d1d3a",
          version: "1",
        },
        input: inputForResponses,
      });

      const msg = response.output?.[0];
      const textPart = msg?.content?.find(
        (p) => p.type === "output_text" || p.type === "text"
      );
      const reply =
        textPart?.text || "I analyzed the chart, but could not generate text.";

      return res.status(200).json({ reply });
    }

    //
    // 3) الدردشة العادية (Chat)
    //
    const inputForResponses = convertMessagesToResponsesInput(messages);

    const response = await client.responses.create({
      model: "gpt-5.1-chat-latest",
      prompt: {
        id: "pmpt_694b5921afa48194a3afd294ebf57e21005f4481712d1d3a",
        version: "1",
      },
      input: inputForResponses,
    });

    const msg = response.output?.[0];
    const textPart = msg?.content?.find(
      (p) => p.type === "output_text" || p.type === "text"
    );
    const reply =
      textPart?.text || "Sorry, I couldn’t generate a reply from the model.";

    return res.status(200).json({ reply });
  } catch (err) {
    console.error("Verse AI backend error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
}
