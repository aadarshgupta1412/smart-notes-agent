import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/supabase/route-client";
import { generateEmbedding } from "@/lib/ai";

export async function POST(request: Request) {
  const { supabase, user, error: authError } = await getAuthenticatedUser(request);
  if (!user) return NextResponse.json({ error: authError }, { status: 401 });

  const body = await request.json();
  const { sourceId, content, highlightId } = body;

  if (!sourceId || !content) {
    return NextResponse.json(
      { error: "sourceId and content are required" },
      { status: 400 }
    );
  }

  try {
    const embedding = await generateEmbedding(content);

    const { data, error } = await supabase
      .from("embeddings")
      .insert({
        user_id: user.id,
        source_id: sourceId,
        highlight_id: highlightId || null,
        content,
        embedding,
      })
      .select("id, source_id, highlight_id, content, created_at")
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json(data, { status: 201 });
  } catch (err) {
    console.error("Embedding generation failed:", err);
    return NextResponse.json({ error: "Embedding generation failed" }, { status: 500 });
  }
}
