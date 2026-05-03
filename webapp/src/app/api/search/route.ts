import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/supabase/route-client";

export async function GET(request: Request) {
  const { supabase, user, error: authError } = await getAuthenticatedUser(request);
  if (!user) return NextResponse.json({ error: authError }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const query = searchParams.get("q");
  const folderIds = searchParams.get("folders")?.split(",").filter(Boolean) || null;

  if (!query?.trim()) {
    return NextResponse.json({ error: "Query parameter 'q' is required" }, { status: 400 });
  }

  const { data, error } = await supabase.rpc("search_content", {
    search_query: query,
    search_user_id: user.id,
    search_folder_ids: folderIds,
    result_limit: 20,
  });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data || []);
}
