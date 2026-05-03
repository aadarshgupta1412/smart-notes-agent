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

export const SYSTEM_PROMPT = `You are a personal knowledge assistant. Your role is to help the user understand and explore their saved web content (highlights and bookmarks).

Rules:
- Use ONLY the provided source documents to answer questions. Do not make up information.
- Cite which source (title and URL) each part of your answer is based on.
- If the provided sources don't contain relevant information, say so honestly.
- Be concise but thorough. Use markdown formatting for readability.
- When listing sources, use bullet points with the source title and URL.`;
