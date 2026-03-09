import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/supabase/route-client";
import { generateEmbedding, generateSummary } from "@/lib/ai";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { supabase, user, error: authError } = await getAuthenticatedUser(request);
  if (!user) return NextResponse.json({ error: authError }, { status: 401 });

  const { data: source, error: srcErr } = await supabase
    .from("sources")
    .select("*")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (srcErr || !source) {
    return NextResponse.json({ error: "Source not found" }, { status: 404 });
  }

  try {
    let pageContent = source.title || source.url;

    const { data: highlights } = await supabase
      .from("highlights")
      .select("content")
      .eq("source_id", id)
      .eq("user_id", user.id);

    if (highlights?.length) {
      pageContent = highlights.map((h) => h.content).join("\n\n");
    }

    await supabase
      .from("embeddings")
      .delete()
      .eq("source_id", id)
      .eq("user_id", user.id);

    await supabase
      .from("ai_summaries")
      .delete()
      .eq("source_id", id)
      .eq("user_id", user.id);

    const summaryText = await generateSummary(pageContent);

    await supabase.from("ai_summaries").insert({
      user_id: user.id,
      source_id: id,
      summary_text: summaryText,
    });

    const embedding = await generateEmbedding(pageContent);
    await supabase.from("embeddings").insert({
      user_id: user.id,
      source_id: id,
      highlight_id: null,
      content: pageContent,
      embedding,
    });

    const summaryEmbedding = await generateEmbedding(summaryText);
    await supabase.from("embeddings").insert({
      user_id: user.id,
      source_id: id,
      highlight_id: null,
      content: summaryText,
      embedding: summaryEmbedding,
    });

    await supabase
      .from("sources")
      .update({ updated_at: new Date().toISOString() })
      .eq("id", id)
      .eq("user_id", user.id);

    return NextResponse.json({ success: true, summary: summaryText });
  } catch (err) {
    console.error("Resync failed:", err);
    return NextResponse.json({ error: "Resync failed" }, { status: 500 });
  }
}
