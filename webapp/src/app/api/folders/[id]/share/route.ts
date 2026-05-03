import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/supabase/route-client";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: folderId } = await params;
  const { supabase, user, error: authError } = await getAuthenticatedUser(request);
  if (!user) return NextResponse.json({ error: authError }, { status: 401 });

  // Verify ownership
  const { data: folder } = await supabase
    .from("folders")
    .select("id, name")
    .eq("id", folderId)
    .eq("user_id", user.id)
    .single();

  if (!folder) return NextResponse.json({ error: "Folder not found" }, { status: 404 });

  // Get all sources in the folder (for the shared view)
  const { data: sources } = await supabase
    .from("sources")
    .select("id, title, url, type, created_at")
    .eq("folder_id", folderId)
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  // Generate a share token (simple approach - in prod use proper share links table)
  const shareToken = crypto.randomUUID();
  
  // For now return the data directly - in production, store the share token
  // and create a public route that retrieves by token
  return NextResponse.json({
    share_id: shareToken,
    folder: { id: folder.id, name: folder.name },
    sources: sources || [],
    share_url: `/shared/${shareToken}`,
  });
}
