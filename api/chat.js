import OpenAI from "openai";

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// CORS so the Figma/website frontend can call this API
const allowedOrigins = [
  "https://memeverseai.tech",
  "https://www.memeverseai.tech",
  "http://localhost:3000", // keep for local testing
];

export default async function handler(req, res) {
  const origin = req.headers.origin;

  if (allowedOrigins.includes(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
  }

  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  // Handle preflight
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
      // Chat prompt you created in OpenAI dashboard
      prompt: {
        id: "pmpt_6948b3a2c5888193862088da7b9b617e060ff263bcdce78a",
        version: "1",
      },
      model: "gpt-5.1-chat-latest",
      input: messages,
      tools: [
        { type: "web_search" },
        { type: "output_text" },
      ],
    });

    // Try to extract plain text reply in a robust way
    let reply = "Sorry, I couldn’t generate a reply.";

    const firstContent = response.output?.[0]?.content?.[0];

    if (firstContent) {
      // When using output_text tool
      if (firstContent.type === "output_text" && firstContent.output_text?.text) {
        reply = firstContent.output_text.text;
      }
      // Fallback if the model returns simple text field
      else if (typeof firstContent.text === "string") {
        reply = firstContent.text;
      }
    }

    res.status(200).json({ reply });
  } catch (err) {
    console.error("Verse AI backend error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
}
