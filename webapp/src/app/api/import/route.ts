import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/supabase/route-client";

interface BookmarkImportItem {
  url: string;
  title?: string;
  folder?: string;
  tags?: string[];
}

export async function POST(request: Request) {
  const { supabase, user, error: authError } = await getAuthenticatedUser(request);
  if (!user) return NextResponse.json({ error: authError }, { status: 401 });

  const { bookmarks, format }: { bookmarks: BookmarkImportItem[]; format?: string } = await request.json();

  if (!bookmarks?.length) {
    return NextResponse.json({ error: "No bookmarks provided" }, { status: 400 });
  }

  const results = { imported: 0, skipped: 0, errors: 0 };
  const folderCache: Record<string, string> = {};

  for (const bm of bookmarks) {
    try {
      // Get or create folder
      let folderId: string;
      const folderName = bm.folder || "Imported";
      
      if (folderCache[folderName]) {
        folderId = folderCache[folderName];
      } else {
        const { data: existing } = await supabase
          .from("folders")
          .select("id")
          .eq("user_id", user.id)
          .eq("name", folderName)
          .single();
        
        if (existing) {
          folderId = existing.id;
        } else {
          const { data: created } = await supabase
            .from("folders")
            .insert({ user_id: user.id, name: folderName })
            .select("id")
            .single();
          folderId = created!.id;
        }
        folderCache[folderName] = folderId;
      }

      // Check for duplicate URL
      const { data: dup } = await supabase
        .from("sources")
        .select("id")
        .eq("user_id", user.id)
        .eq("url", bm.url)
        .single();

      if (dup) {
        results.skipped++;
        continue;
      }

      // Insert source
      const { data: source, error } = await supabase
        .from("sources")
        .insert({
          user_id: user.id,
          folder_id: folderId,
          url: bm.url,
          title: bm.title || bm.url,
          type: "bookmark",
        })
        .select("id")
        .single();

      if (error) {
        results.errors++;
        continue;
      }

      // Handle tags if provided
      if (bm.tags?.length && source) {
        for (const tagName of bm.tags) {
          const { data: existingTag } = await supabase
            .from("tags")
            .select("id")
            .eq("user_id", user.id)
            .eq("name", tagName)
            .single();

          let tagId: string;
          if (existingTag) {
            tagId = existingTag.id;
          } else {
            const { data: newTag } = await supabase
              .from("tags")
              .insert({ user_id: user.id, name: tagName })
              .select("id")
              .single();
            tagId = newTag!.id;
          }

          await supabase.from("source_tags").insert({ source_id: source.id, tag_id: tagId });
        }
      }

      // Trigger embedding generation (fire-and-forget)
      const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://127.0.0.1:8000";
      fetch(`${BACKEND_URL}/embeddings/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Internal-Key": process.env.INTERNAL_API_KEY || "dev-internal-key" },
        body: JSON.stringify({ user_id: user.id, source_id: source.id, content: bm.title || bm.url }),
      }).catch(() => {});

      results.imported++;
    } catch {
      results.errors++;
    }
  }

  return NextResponse.json(results);
}
