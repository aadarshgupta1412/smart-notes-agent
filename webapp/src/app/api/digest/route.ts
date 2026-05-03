import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/supabase/route-client";

export async function GET(request: Request) {
  const { supabase, user, error: authError } = await getAuthenticatedUser(request);
  if (!user) return NextResponse.json({ error: authError }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const days = parseInt(searchParams.get("days") || "7");
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

  // Get recent sources
  const { data: recentSources } = await supabase
    .from("sources")
    .select("id, title, url, folder_id, type, created_at")
    .eq("user_id", user.id)
    .gte("created_at", since)
    .order("created_at", { ascending: false });

  // Get recent highlights
  const { data: recentHighlights } = await supabase
    .from("highlights")
    .select("id, content, source_id, created_at")
    .eq("user_id", user.id)
    .gte("created_at", since)
    .order("created_at", { ascending: false });

  // Get chat count
  const { count: chatCount } = await supabase
    .from("chats")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id)
    .gte("created_at", since);

  return NextResponse.json({
    period_days: days,
    since,
    sources: {
      count: recentSources?.length || 0,
      items: (recentSources || []).slice(0, 10),
    },
    highlights: {
      count: recentHighlights?.length || 0,
      items: (recentHighlights || []).slice(0, 10),
    },
    chats: {
      count: chatCount || 0,
    },
  });
}
