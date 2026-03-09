import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/supabase/route-client";
import { generateEmbedding, generateSummary } from "@/lib/ai";

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

  return NextResponse.json(
    { source: newSource, folderId: targetFolderId },
    { status: 201 }
  );
}
