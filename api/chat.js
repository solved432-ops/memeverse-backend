import OpenAI from "openai";

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Add CORS so the Figma/website frontend can call this API
const allowedOrigins = [
  "https://memeverseai.tech",
  "https://www.memeverseai.tech",
  "http://localhost:3000", // keep for local testing
  // add any other preview domain you use here
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
      model: "gpt-5.1-chat-latest",
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
