import { NextResponse } from "next/server";
import { streamText } from "ai";
import { getAuthenticatedUser } from "@/lib/supabase/route-client";
import { getChatModel, generateEmbedding, SYSTEM_PROMPT } from "@/lib/ai";
import type { ChatFilters } from "@/lib/types";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: chatId } = await params;
  const { supabase, user, error: authError } = await getAuthenticatedUser(request);
  if (!user) return NextResponse.json({ error: authError }, { status: 401 });

  const { data: chat } = await supabase
    .from("chats")
    .select("id")
    .eq("id", chatId)
    .eq("user_id", user.id)
    .single();

  if (!chat) return NextResponse.json({ error: "Chat not found" }, { status: 404 });

  const body = await request.json();
  const { message, filters }: { message: string; filters?: ChatFilters } = body;

  if (!message?.trim()) {
    return NextResponse.json({ error: "Message is required" }, { status: 400 });
  }

  await supabase.from("messages").insert({
    chat_id: chatId,
    user_id: user.id,
    role: "user",
    content: message,
  });

  let contextText = "";
  try {
    const queryEmbedding = await generateEmbedding(message);

    const { data: matches } = await supabase.rpc("match_embeddings", {
      query_embedding: queryEmbedding,
      match_user_id: user.id,
      match_folder_ids: filters?.folderIds?.length ? filters.folderIds : null,
      match_source_ids: filters?.sourceIds?.length ? filters.sourceIds : null,
      match_count: 8,
      match_threshold: 0.3,
    });

    if (matches?.length) {
      const sourceIds = [...new Set(matches.map((m: { source_id: string }) => m.source_id))];
      const { data: sources } = await supabase
        .from("sources")
        .select("id, url, title")
        .in("id", sourceIds);

      const sourceMap = new Map(
        (sources || []).map((s) => [s.id, s])
      );

      contextText = matches
        .map((m: { source_id: string; content: string; similarity: number }) => {
          const src = sourceMap.get(m.source_id);
          return `[Source: ${src?.title || "Untitled"} (${src?.url || "unknown"})]\n${m.content}`;
        })
        .join("\n\n---\n\n");
    }
  } catch (err) {
    console.error("RAG retrieval failed, proceeding without context:", err);
  }

  const { data: history } = await supabase
    .from("messages")
    .select("role, content")
    .eq("chat_id", chatId)
    .eq("user_id", user.id)
    .order("created_at", { ascending: true })
    .limit(20);

  const messages = [
    {
      role: "system" as const,
      content: contextText
        ? `${SYSTEM_PROMPT}\n\n## User's saved content (use as context):\n\n${contextText}`
        : SYSTEM_PROMPT,
    },
    ...(history || []).map((m) => ({
      role: m.role as "user" | "assistant",
      content: m.content,
    })),
  ];

  const result = streamText({
    model: getChatModel(),
    messages,
    async onFinish({ text }) {
      await supabase.from("messages").insert({
        chat_id: chatId,
        user_id: user.id,
        role: "assistant",
        content: text,
      });

      await supabase
        .from("chats")
        .update({ updated_at: new Date().toISOString() })
        .eq("id", chatId);
    },
  });

  return result.toDataStreamResponse();
}
