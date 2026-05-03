import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/supabase/route-client";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: sourceId } = await params;
  const { supabase, user, error: authError } = await getAuthenticatedUser(request);
  if (!user) return NextResponse.json({ error: authError }, { status: 401 });

  const { data, error } = await supabase.rpc("get_source_connections", {
    p_source_id: sourceId,
    p_user_id: user.id,
    p_limit: 5,
  });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data || []);
}
