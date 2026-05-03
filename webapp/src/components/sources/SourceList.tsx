"use client";

import { RefreshCw, Globe, Loader2, Highlighter, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { Folder, Source } from "@/lib/types";
import { useState } from "react";

interface Props {
  sources: Source[];
  folder: Folder;
  onSourceClick: (source: Source) => void;
  onRefresh: () => void;
}

export default function SourceList({
  sources,
  folder,
  onSourceClick,
  onRefresh,
}: Props) {
  const [resyncingId, setResyncingId] = useState<string | null>(null);

  const handleResync = async (e: React.MouseEvent, sourceId: string) => {
    e.stopPropagation();
    setResyncingId(sourceId);
    try {
      await fetch(`/api/sources/${sourceId}/resync`, { method: "POST" });
      onRefresh();
    } catch (err) {
      console.error("Resync failed:", err);
    }
    setResyncingId(null);
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return "Today";
    if (diffDays === 1) return "Yesterday";
    if (diffDays < 7) return `${diffDays}d ago`;

    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });
  };

  const getDomain = (url: string) => {
    try {
      return new URL(url).hostname.replace("www.", "");
    } catch {
      return url;
    }
  };

  if (!sources.length) {
    return (
      <div className="p-3 flex flex-col gap-1">
        <div className="flex items-center justify-between px-3 mb-1">
          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
            Sources in {folder.name}
          </span>
          <span className="text-xs text-muted-foreground">0</span>
        </div>
        <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
          <Globe className="size-8 text-muted-foreground/50 mb-3" />
          <p className="text-sm font-medium text-foreground mb-1">No sources yet</p>
          <p className="text-xs text-muted-foreground">
            Use the Chrome extension to save highlights and bookmarks
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-3 flex flex-col gap-1">
      <div className="flex items-center justify-between px-3 mb-1">
        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
          Sources in {folder.name}
        </span>
        <span className="text-xs text-muted-foreground">{sources.length}</span>
      </div>

      <div className="flex flex-col gap-0.5">
        {sources.map((source) => (
          <button
            key={source.id}
            onClick={() => onSourceClick(source)}
            className={cn(
              "w-full flex items-center gap-3 px-3 py-2.5 rounded-md",
              "hover:bg-secondary transition-colors text-left group"
            )}
          >
            {source.type === "highlight" ? (
              <Highlighter className="size-4 text-highlight shrink-0" />
            ) : (
              <Globe className="size-4 text-muted-foreground group-hover:text-primary shrink-0 transition-colors" />
            )}

            <div className="flex-1 min-w-0">
              <p className="text-sm text-foreground truncate group-hover:text-primary transition-colors">
                {source.title || "Untitled"}
              </p>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-xs text-muted-foreground truncate">
                  {getDomain(source.url)}
                </span>
                <span className="text-xs text-muted-foreground">&middot;</span>
                <span className="text-xs text-muted-foreground">
                  {formatDate(source.created_at)}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-1 shrink-0">
              <Badge variant="secondary" className="text-[10px] capitalize font-normal">
                {source.type}
              </Badge>
              <Button
                variant="ghost"
                size="icon"
                className="size-6 opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={(e) => handleResync(e, source.id)}
                disabled={resyncingId === source.id}
              >
                {resyncingId === source.id ? (
                  <Loader2 className="size-3 animate-spin" />
                ) : (
                  <RefreshCw className="size-3" />
                )}
              </Button>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
