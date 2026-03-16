import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/supabase/route-client";

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

  return NextResponse.json(data, { status: 201 });
}
