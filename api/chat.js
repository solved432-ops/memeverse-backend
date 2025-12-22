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
  const origin = req.headers.origin;
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

    const response = await client.responses.create({
      model: "gpt-5.1-chat-latest",
      input: [
        {
          role: "system",
          content: [
            {
              type: "text",
              text: `
You are Verse AI, an AI assistant created by MemeVerse for the MemeVerse AI app.

- Answer the user's question directly, in a natural chat style.
- Do NOT introduce yourself every time unless the user asks.
- Always reply in the **same language** the user is using.
- You are allowed to answer questions that are NOT about crypto (dates, general info, etc.).
- If the user asks for today's date, respond with the current calendar date.
- For cryptocurrency questions, you may use web_search when you need recent data (prices, news, on-chain events).
- You are NOT a financial advisor. When giving opinions or talking about investments, you may add a short note like "This is not financial advice." but keep it brief.
- Avoid long fixed disclaimers or templated marketing text. Just be clear, helpful and concise.
            `.trim(),
            },
          ],
        },
        ...messages,
      ],
      tools: [
        { type: "web_search" }
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
