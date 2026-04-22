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
import { Card, CardContent } from "@/components/ui/card";
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
        <Skeleton className="h-28 w-full rounded-xl" />
        <Skeleton className="h-14 w-full rounded-xl" />
        <div className="flex flex-col gap-3">
          <Skeleton className="h-4 w-1/3" />
          <Skeleton className="h-20 w-full rounded-xl" />
          <Skeleton className="h-20 w-full rounded-xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 flex flex-col gap-4 animate-fade-in">
      {/* Source header card */}
      <Card className="border-border/50 overflow-hidden">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <div className={cn(
              "size-12 flex items-center justify-center rounded-xl",
              source.type === "highlight"
                ? "bg-amber-100 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400"
                : "bg-indigo-100 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400"
            )}>
              {source.type === "highlight" ? (
                <Highlighter className="size-5" />
              ) : (
                <Globe className="size-5" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-foreground truncate">
                {source.title || "Untitled"}
              </h3>
              <p className="text-sm text-muted-foreground truncate mt-0.5">
                {getDomain(source.url)}
              </p>
              <div className="flex items-center gap-3 mt-2">
                <Badge 
                  variant="secondary" 
                  className={cn(
                    "text-xs capitalize",
                    source.type === "highlight" && "bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-400"
                  )}
                >
                  {source.type}
                </Badge>
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  <Calendar className="size-3" />
                  {formatDate(source.created_at)}
                </span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* AI Summary section */}
      <Collapsible open={showSummary} onOpenChange={setShowSummary}>
        <Card className="border-border/50 overflow-hidden">
          {/* Gradient header */}
          <CollapsibleTrigger className="w-full">
            <div className="ai-summary-header flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="size-4" />
                <span>AI Summary</span>
              </div>
              {showSummary ? (
                <ChevronUp className="size-4 opacity-70" />
              ) : (
                <ChevronDown className="size-4 opacity-70" />
              )}
            </div>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <CardContent className="p-4">
              {summary ? (
                <p className="text-sm text-foreground leading-relaxed">
                  {summary.summary_text}
                </p>
              ) : (
                <div className="flex flex-col items-center py-4 text-center">
                  <div className="size-10 rounded-full bg-muted flex items-center justify-center mb-2">
                    <Sparkles className="size-4 text-muted-foreground" />
                  </div>
                  <p className="text-sm text-muted-foreground">
                    No summary available yet
                  </p>
                  <Button variant="ghost" size="sm" className="mt-2 text-xs">
                    <RefreshCw className="size-3 mr-1" />
                    Generate Summary
                  </Button>
                </div>
              )}
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>

      {/* Source URL */}
      <a
        href={source.url}
        target="_blank"
        rel="noopener noreferrer"
        className={cn(
          "flex items-center gap-3 px-4 py-3 rounded-xl",
          "bg-card border border-border/50",
          "hover:border-primary/30 hover:shadow-md",
          "transition-all duration-200 group"
        )}
      >
        <div className="size-9 rounded-lg bg-muted flex items-center justify-center group-hover:bg-primary/10 transition-colors">
          <ExternalLink className="size-4 text-muted-foreground group-hover:text-primary transition-colors" />
        </div>
        <span className="text-sm text-primary truncate flex-1 text-left">
          {source.url}
        </span>
      </a>

      {/* Highlights section */}
      {source.type === "highlight" && highlights.length > 0 && (
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between px-1">
            <div className="flex items-center gap-2">
              <Highlighter className="size-4 text-amber-500" />
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Highlights
              </span>
            </div>
            <Badge variant="secondary" className="text-xs">
              {highlights.length}
            </Badge>
          </div>
          
          {highlights.map((hl, index) => (
            <div
              key={hl.id}
              className="highlight-block animate-fade-in"
              style={{ animationDelay: `${index * 0.05}s` }}
            >
              <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">
                &ldquo;{hl.content}&rdquo;
              </p>
              <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
                <Clock className="size-3" />
                {formatDate(hl.created_at)} at {formatTime(hl.created_at)}
              </p>
            </div>
          ))}
        </div>
      )}

      <Separator className="my-1" />

      {/* Metadata footer */}
      <div className="px-1 flex flex-col gap-2 text-xs text-muted-foreground">
        <div className="flex items-center justify-between">
          <span>Added</span>
          <span className="text-foreground">
            {formatDate(source.created_at)} at {formatTime(source.created_at)}
          </span>
        </div>
        {source.updated_at !== source.created_at && (
          <div className="flex items-center justify-between">
            <span>Last updated</span>
            <span className="text-foreground">
              {formatDate(source.updated_at)} at {formatTime(source.updated_at)}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
