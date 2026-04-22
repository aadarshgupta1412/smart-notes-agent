"use client";

import { RefreshCw, Globe, FileText, Loader2, ExternalLink, Highlighter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
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
  const [hoveredId, setHoveredId] = useState<string | null>(null);

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
    if (diffDays < 7) return `${diffDays} days ago`;
    
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
      <div className="p-4 flex flex-col gap-3">
        <div className="flex items-center justify-between px-1">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Sources in {folder.name}
          </h3>
          <Badge variant="secondary" className="text-xs">0</Badge>
        </div>
        
        <div className="flex flex-col items-center justify-center py-12 px-4 text-center animate-fade-in">
          <div className="size-16 rounded-2xl bg-muted/50 flex items-center justify-center mb-4">
            <Globe className="size-8 text-muted-foreground" />
          </div>
          <p className="text-sm font-medium text-foreground mb-1">No sources yet</p>
          <p className="text-xs text-muted-foreground max-w-[200px]">
            Use the Chrome extension to save highlights and bookmarks
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 flex flex-col gap-3">
      {/* Section header */}
      <div className="flex items-center justify-between px-1 mb-1">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Sources in {folder.name}
        </h3>
        <Badge variant="secondary" className="text-xs">
          {sources.length}
        </Badge>
      </div>

      {/* Source list */}
      <div className="flex flex-col gap-2">
        {sources.map((source, index) => (
          <button
            key={source.id}
            onClick={() => onSourceClick(source)}
            onMouseEnter={() => setHoveredId(source.id)}
            onMouseLeave={() => setHoveredId(null)}
            className={cn(
              "w-full flex items-start gap-3 px-4 py-3 rounded-xl",
              "bg-card border border-border/50",
              "hover:border-primary/30 hover:shadow-md",
              "transition-all duration-200 text-left group",
              "animate-fade-in"
            )}
            style={{ animationDelay: `${index * 0.03}s` }}
          >
            {/* Icon */}
            <div className={cn(
              "size-10 flex items-center justify-center rounded-xl transition-all duration-200 mt-0.5",
              source.type === "highlight"
                ? hoveredId === source.id
                  ? "bg-amber-500 text-white shadow-md"
                  : "bg-amber-100 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400"
                : hoveredId === source.id
                  ? "bg-primary text-primary-foreground shadow-md"
                  : "bg-indigo-100 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400"
            )}>
              {source.type === "highlight" ? (
                <Highlighter className="size-4" />
              ) : (
                <Globe className="size-4" />
              )}
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <p className="font-medium text-foreground truncate text-sm group-hover:text-primary transition-colors">
                {source.title || "Untitled"}
              </p>
              <p className="text-xs text-muted-foreground truncate mt-0.5">
                {getDomain(source.url)}
              </p>
              <div className="flex items-center gap-2 mt-2">
                <span className="text-xs text-muted-foreground">
                  {formatDate(source.created_at)}
                </span>
                <Badge 
                  variant="secondary" 
                  className={cn(
                    "text-xs font-normal capitalize",
                    source.type === "highlight" && "bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-400"
                  )}
                >
                  {source.type}
                </Badge>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <Button
                variant="ghost"
                size="icon"
                className="size-8 hover:bg-primary/10 hover:text-primary"
                onClick={(e) => handleResync(e, source.id)}
                disabled={resyncingId === source.id}
              >
                {resyncingId === source.id ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <RefreshCw className="size-4" />
                )}
              </Button>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
