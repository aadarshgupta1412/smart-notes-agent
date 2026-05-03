/**
 * AI utilities - calls Python FastAPI backend for LLM operations
 */

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://127.0.0.1:8000";
const INTERNAL_KEY = process.env.INTERNAL_API_KEY || "dev-internal-key";

export async function generateEmbedding(text: string, userId?: string): Promise<number[]> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "X-Internal-Key": INTERNAL_KEY,
  };
  if (userId) headers["X-User-Id"] = userId;

  const response = await fetch(`${BACKEND_URL}/llm/embed`, {
    method: "POST",
    headers,
    body: JSON.stringify({ text: text.slice(0, 8000) }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Embedding failed: ${error}`);
  }

  const data = await response.json();
  return data.embedding;
}

export async function generateSummary(content: string, userId?: string): Promise<string> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "X-Internal-Key": INTERNAL_KEY,
  };
  if (userId) headers["X-User-Id"] = userId;

  const response = await fetch(`${BACKEND_URL}/llm/summarize`, {
    method: "POST",
    headers,
    body: JSON.stringify({ content: content.slice(0, 6000), max_tokens: 200 }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Summary failed: ${error}`);
  }

  const data = await response.json();
  return data.summary;
}

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export async function streamChat(
  messages: ChatMessage[],
  context: string = "",
  tier: "fast" | "strong" = "fast",
  userId?: string
): Promise<ReadableStream<Uint8Array>> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "X-Internal-Key": INTERNAL_KEY,
  };
  if (userId) headers["X-User-Id"] = userId;

  const response = await fetch(`${BACKEND_URL}/llm/chat`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      messages: messages.map((m) => ({ role: m.role, content: m.content })),
      context,
      tier,
      stream: true,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Chat failed: ${error}`);
  }

  if (!response.body) {
    throw new Error("No response body");
  }

  return response.body;
}

export const SYSTEM_PROMPT = `You are a personal knowledge assistant. You help users explore their saved web content (highlights, bookmarks) AND discover new information.

Rules:
- When relevant saved content is provided, prioritize it and cite sources (title + URL).
- When no saved content matches the query, answer from your general knowledge. Be helpful and informative.
- Clearly distinguish between information from saved sources vs general knowledge.
- Be concise but thorough. Use markdown formatting for readability.
- For saved content: use bullet points with source title and URL.
- For general knowledge: provide accurate, educational answers that help the user learn.`;
