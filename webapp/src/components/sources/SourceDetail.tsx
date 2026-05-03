"use client";

import { useState, useEffect } from "react";
import {
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Highlighter,
  Sparkles,
  RefreshCw,
  Calendar,
  Globe,
  Clock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";
import type { Source, Highlight, AISummary } from "@/lib/types";

interface Props {
  source: Source;
}

export default function SourceDetail({ source }: Props) {
  const [summary, setSummary] = useState<AISummary | null>(null);
  const [highlights, setHighlights] = useState<Highlight[]>([]);
  const [showSummary, setShowSummary] = useState(true);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchDetails() {
      setLoading(true);
      const res = await fetch(`/api/sources/${source.id}`);
      if (res.ok) {
        const data = await res.json();
        setSummary(data.ai_summary || null);
        setHighlights(data.highlights || []);
      }
      setLoading(false);
    }
    fetchDetails();
  }, [source.id]);

  const getDomain = (url: string) => {
    try {
      return new URL(url).hostname.replace("www.", "");
    } catch {
      return url;
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const formatTime = (dateStr: string) => {
    return new Date(dateStr).toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
    });
  };

  if (loading) {
    return (
      <div className="p-4 flex flex-col gap-4">
        <Skeleton className="h-20 w-full rounded-md" />
        <Skeleton className="h-10 w-full rounded-md" />
        <div className="flex flex-col gap-3">
          <Skeleton className="h-3 w-1/3" />
          <Skeleton className="h-16 w-full rounded-md" />
          <Skeleton className="h-16 w-full rounded-md" />
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 flex flex-col gap-4">
      {/* Source header */}
      <div className="flex items-start gap-3">
        {source.type === "highlight" ? (
          <Highlighter className="size-5 text-highlight shrink-0 mt-0.5" />
        ) : (
          <Globe className="size-5 text-muted-foreground shrink-0 mt-0.5" />
        )}
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-semibold text-foreground">
            {source.title || "Untitled"}
          </h3>
          <p className="text-xs text-muted-foreground truncate mt-0.5">
            {getDomain(source.url)}
          </p>
          <div className="flex items-center gap-2 mt-2">
            <Badge variant="secondary" className="text-[10px] capitalize">
              {source.type}
            </Badge>
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <Calendar className="size-3" />
              {formatDate(source.created_at)}
            </span>
          </div>
        </div>
      </div>

      <Separator />

      {/* AI Summary */}
      <Collapsible open={showSummary} onOpenChange={setShowSummary}>
        <CollapsibleTrigger className="w-full rounded-md hover:bg-secondary transition-colors">
          <div className="flex items-center justify-between px-1 py-1.5">
            <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground uppercase tracking-wider">
              <Sparkles className="size-3.5" />
              AI Summary
            </div>
            {showSummary ? (
              <ChevronUp className="size-3.5 text-muted-foreground" />
            ) : (
              <ChevronDown className="size-3.5 text-muted-foreground" />
            )}
          </div>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="mt-2">
            {summary ? (
              <p className="text-sm text-foreground leading-relaxed px-1">
                {summary.summary_text}
              </p>
            ) : (
              <div className="flex flex-col items-center py-4 text-center">
                <Sparkles className="size-5 text-muted-foreground/50 mb-2" />
                <p className="text-xs text-muted-foreground mb-2">
                  No summary available
                </p>
                <Button variant="ghost" size="sm" className="text-xs h-7">
                  <RefreshCw className="size-3 mr-1.5" />
                  Generate
                </Button>
              </div>
            )}
          </div>
        </CollapsibleContent>
      </Collapsible>

      <Separator />

      {/* Source URL */}
      <a
        href={source.url}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center gap-2.5 px-3 py-2 rounded-md border border-border hover:border-primary/30 bg-card transition-colors group"
      >
        <ExternalLink className="size-3.5 text-muted-foreground group-hover:text-primary shrink-0" />
        <span className="text-xs text-primary truncate">{source.url}</span>
      </a>

      {/* Highlights */}
      {source.type === "highlight" && highlights.length > 0 && (
        <>
          <div className="flex items-center justify-between px-1">
            <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground uppercase tracking-wider">
              <Highlighter className="size-3.5 text-highlight" />
              Highlights
            </div>
            <span className="text-xs text-muted-foreground">{highlights.length}</span>
          </div>

          {highlights.map((hl) => (
            <div
              key={hl.id}
              className="border-l-2 border-highlight pl-3 py-2 rounded-r-md hover:bg-highlight-subtle transition-colors"
            >
              <p className="text-sm text-foreground leading-relaxed">
                &ldquo;{hl.content}&rdquo;
              </p>
              <p className="text-xs text-muted-foreground mt-1.5 flex items-center gap-1">
                <Clock className="size-3" />
                {formatDate(hl.created_at)} at {formatTime(hl.created_at)}
              </p>
            </div>
          ))}
        </>
      )}

      <Separator />

      {/* Metadata */}
      <div className="px-1 flex flex-col gap-1.5 text-xs text-muted-foreground">
        <div className="flex items-center justify-between">
          <span>Added</span>
          <span className="text-foreground">
            {formatDate(source.created_at)} at {formatTime(source.created_at)}
          </span>
        </div>
        {source.updated_at !== source.created_at && (
          <div className="flex items-center justify-between">
            <span>Updated</span>
            <span className="text-foreground">
              {formatDate(source.updated_at)} at {formatTime(source.updated_at)}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
