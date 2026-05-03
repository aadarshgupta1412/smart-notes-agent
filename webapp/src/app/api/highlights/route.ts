import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/supabase/route-client";

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
  const sourceId = searchParams.get("sourceId");

  let query = supabase
    .from("highlights")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (sourceId) {
    query = query.eq("source_id", sourceId);
  }

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json(data);
}

export async function POST(request: Request) {
  const { supabase, user, error: authError } = await getAuthenticatedUser(request);
  if (!user) return NextResponse.json({ error: authError }, { status: 401 });

  const body = await request.json();
  const { sourceId, content } = body;

  if (!sourceId || !content) {
    return NextResponse.json({ error: "sourceId and content are required" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("highlights")
    .insert({ user_id: user.id, source_id: sourceId, content })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Fire-and-forget embedding generation via Python backend
  triggerEmbedding(user.id, data.source_id, data.content, data.id);

  return NextResponse.json(data, { status: 201 });
}
