import { openai } from "@ai-sdk/openai";
import OpenAI from "openai";

export function getChatModel() {
  return openai("gpt-4o-mini");
}

let _openaiClient: OpenAI | null = null;
function getOpenAIClient(): OpenAI {
  if (!_openaiClient) {
    _openaiClient = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  }
  return _openaiClient;
}

export async function generateEmbedding(text: string): Promise<number[]> {
  const client = getOpenAIClient();
  const response = await client.embeddings.create({
    model: "text-embedding-3-small",
    input: text.slice(0, 8000),
  });
  return response.data[0].embedding;
}

export async function generateSummary(content: string): Promise<string> {
  const client = getOpenAIClient();
  const response = await client.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      {
        role: "system",
        content:
          "You are a concise summarizer. Summarize the following web content in 2-3 sentences, capturing the key points.",
      },
      { role: "user", content: content.slice(0, 6000) },
    ],
    max_tokens: 200,
  });
  return response.choices[0]?.message?.content || "Summary unavailable.";
}

export const SYSTEM_PROMPT = `You are a personal knowledge assistant. Your role is to help the user understand and explore their saved web content (highlights and bookmarks).

Rules:
- Use ONLY the provided source documents to answer questions. Do not make up information.
- Cite which source (title and URL) each part of your answer is based on.
- If the provided sources don't contain relevant information, say so honestly.
- Be concise but thorough. Use markdown formatting for readability.
- When listing sources, use bullet points with the source title and URL.`;
