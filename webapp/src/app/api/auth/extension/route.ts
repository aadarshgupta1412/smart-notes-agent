import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const { idToken, accessToken } = await request.json();

    if (!idToken && !accessToken) {
      return NextResponse.json({ error: "Missing token" }, { status: 400 });
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    const { data, error } = await supabase.auth.signInWithIdToken({
      provider: "google",
      token: idToken || accessToken,
    });

    if (error) {
      console.error("Supabase signInWithIdToken error:", error.message);
      return NextResponse.json({ error: error.message }, { status: 401 });
    }

    return NextResponse.json({
      session: {
        access_token: data.session?.access_token,
        refresh_token: data.session?.refresh_token,
        expires_at: data.session?.expires_at,
      },
      user: {
        id: data.user?.id,
        email: data.user?.email,
        name: data.user?.user_metadata?.full_name,
      },
    });
  } catch (err) {
    console.error("Extension auth error:", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
