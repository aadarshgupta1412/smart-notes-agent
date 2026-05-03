import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/supabase/route-client";
import { generateEmbedding, generateSummary } from "@/lib/ai";

async function triggerEmbedding(userId: string, sourceId: string, content: string, highlightId?: string) {
  const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://127.0.0.1:8000";
  const INTERNAL_KEY = process.env.INTERNAL_API_KEY || "dev-internal-key";
  try {
    await fetch(`${BACKEND_URL}/embeddings/generate`, {
      method: "POST",
      headers: { 
        "Content-Type": "application/json",
        "X-Internal-Key": INTERNAL_KEY,
      },
      body: JSON.stringify({ user_id: userId, source_id: sourceId, content, highlight_id: highlightId }),
    });
  } catch (e) {
    console.error("Failed to trigger embedding:", e);
  }
}

export async function GET(request: Request) {
  const { supabase, user, error: authError } = await getAuthenticatedUser(request);
  if (!user) return NextResponse.json({ error: authError }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const folderId = searchParams.get("folderId");

  let query = supabase
    .from("sources")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (folderId) {
    query = query.eq("folder_id", folderId);
  }

  const { data, error } = await query;

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json(data);
}

export async function POST(request: Request) {
  const { supabase, user, error: authError } = await getAuthenticatedUser(request);
  if (!user) return NextResponse.json({ error: authError }, { status: 401 });

  const body = await request.json();
  const { folderId, newFolderName, source, content, pageMetadata } = body;

  let targetFolderId = folderId;

  if (!targetFolderId && newFolderName) {
    const { data: newFolder, error: folderErr } = await supabase
      .from("folders")
      .insert({ user_id: user.id, name: newFolderName.trim() })
      .select()
      .single();

    if (folderErr) return NextResponse.json({ error: folderErr.message }, { status: 500 });
    targetFolderId = newFolder.id;
  }

  if (!targetFolderId) {
    return NextResponse.json({ error: "folderId or newFolderName required" }, { status: 400 });
  }

  const { data: newSource, error: sourceErr } = await supabase
    .from("sources")
    .insert({
      user_id: user.id,
      folder_id: targetFolderId,
      url: source.url,
      title: source.title || null,
      type: source.type || "bookmark",
      page_metadata: pageMetadata || {},
    })
    .select()
    .single();

  if (sourceErr) return NextResponse.json({ error: sourceErr.message }, { status: 500 });

  if (content && source.type === "highlight") {
    const { error: hlErr } = await supabase
      .from("highlights")
      .insert({
        user_id: user.id,
        source_id: newSource.id,
        content,
      });

    if (hlErr) console.error("Failed to save highlight:", hlErr.message);

    // Fire-and-forget: generate embedding for highlight
    generateEmbedding(content)
      .then((embedding) =>
        supabase.from("embeddings").insert({
          user_id: user.id,
          source_id: newSource.id,
          highlight_id: null,
          content,
          embedding,
        })
      )
      .catch((err: unknown) => console.error("Embedding generation failed:", err));
  }

  if (content || source.title) {
    const textForSummary = content || source.title || source.url;
    // Fire-and-forget: generate summary + embedding
    generateSummary(textForSummary)
      .then(async (summaryText) => {
        await supabase.from("ai_summaries").insert({
          user_id: user.id,
          source_id: newSource.id,
          summary_text: summaryText,
        });
        const embedding = await generateEmbedding(summaryText);
        await supabase.from("embeddings").insert({
          user_id: user.id,
          source_id: newSource.id,
          highlight_id: null,
          content: summaryText,
          embedding,
        });
      })
      .catch((err: unknown) => console.error("Summary generation failed:", err));
  }

  // Fire-and-forget embedding generation via Python backend
  triggerEmbedding(user.id, newSource.id, newSource.title || newSource.url);

  // After source creation, trigger content extraction (fire-and-forget)
  const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://127.0.0.1:8000";
  const INTERNAL_KEY = process.env.INTERNAL_API_KEY || "dev-internal-key";
  fetch(`${BACKEND_URL}/embeddings/extract-content`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Internal-Key": INTERNAL_KEY },
    body: JSON.stringify({ user_id: user.id, source_id: newSource.id, url: newSource.url }),
  }).catch((e) => console.error("Content extraction trigger failed:", e));

  return NextResponse.json(
    { source: newSource, folderId: targetFolderId },
    { status: 201 }
  );
}
