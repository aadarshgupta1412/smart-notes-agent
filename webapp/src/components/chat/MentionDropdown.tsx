"use client";

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { FolderIcon, Globe, Highlighter, Search } from "lucide-react";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import type { Folder, Source } from "@/lib/types";

interface Props {
  onSelect: (type: "folder" | "source", id: string, name: string) => void;
  onClose: () => void;
}

type MentionItem =
  | { type: "folder"; data: Folder }
  | { type: "source"; data: Source };

export default function MentionDropdown({ onSelect, onClose }: Props) {
  const [folders, setFolders] = useState<Folder[]>([]);
  const [sources, setSources] = useState<Source[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  const allItems: MentionItem[] = useMemo(() => [
    ...folders.map((f) => ({ type: "folder" as const, data: f })),
    ...sources.slice(0, 10).map((s) => ({ type: "source" as const, data: s })),
  ], [folders, sources]);

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      const [foldersRes, sourcesRes] = await Promise.all([
        fetch("/api/folders"),
        fetch("/api/sources"),
      ]);
      if (foldersRes.ok) setFolders(await foldersRes.json());
      if (sourcesRes.ok) setSources(await sourcesRes.json());
      setLoading(false);
    }
    fetchData();
  }, []);

  useEffect(() => {
    const handleClickOutside = () => onClose();
    const timer = setTimeout(() => {
      document.addEventListener("click", handleClickOutside);
    }, 100);
    return () => {
      clearTimeout(timer);
      document.removeEventListener("click", handleClickOutside);
    };
  }, [onClose]);

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (allItems.length === 0) return;

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setSelectedIndex((prev) => (prev + 1) % allItems.length);
        break;
      case "ArrowUp":
        e.preventDefault();
        setSelectedIndex((prev) => (prev - 1 + allItems.length) % allItems.length);
        break;
      case "Enter":
        e.preventDefault();
        const item = allItems[selectedIndex];
        if (item) {
          if (item.type === "folder") {
            onSelect("folder", item.data.id, item.data.name);
          } else {
            onSelect("source", item.data.id, item.data.title || item.data.url);
          }
        }
        break;
      case "Escape":
        e.preventDefault();
        onClose();
        break;
    }
  }, [allItems, selectedIndex, onSelect, onClose]);

  useEffect(() => {
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  const getDomain = (url: string) => {
    try {
      return new URL(url).hostname.replace("www.", "");
    } catch {
      return url;
    }
  };

  let currentIndex = -1;

  return (
    <Card
      ref={containerRef}
      className="shadow-md border-border overflow-hidden"
      onClick={(e) => e.stopPropagation()}
    >
      <div className="px-3 py-1.5 border-b border-border">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Search className="size-3" />
          <span>Use <kbd className="kbd text-[10px]">↑↓</kbd> to navigate</span>
        </div>
      </div>

      <ScrollArea className="max-h-64">
        {loading ? (
          <div className="p-2 flex flex-col gap-1">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3 px-2 py-2">
                <Skeleton className="size-6 rounded" />
                <div className="flex-1 flex flex-col gap-1">
                  <Skeleton className="h-3.5 w-3/4" />
                  <Skeleton className="h-3 w-1/2" />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-1.5">
            {folders.length > 0 && (
              <div className="mb-1">
                <p className="px-2 py-1 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                  Folders
                </p>
                {folders.map((folder) => {
                  currentIndex++;
                  const itemIndex = currentIndex;
                  return (
                    <button
                      key={folder.id}
                      onClick={() => onSelect("folder", folder.id, folder.name)}
                      className={cn(
                        "w-full flex items-center gap-2.5 px-2 py-1.5 rounded-md text-left transition-colors",
                        selectedIndex === itemIndex
                          ? "bg-accent text-accent-foreground"
                          : "hover:bg-secondary"
                      )}
                    >
                      <FolderIcon className="size-3.5 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm truncate">{folder.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {folder.source_count ?? 0} items
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}

            {folders.length > 0 && sources.length > 0 && (
              <Separator className="my-1" />
            )}

            {sources.length > 0 && (
              <div>
                <p className="px-2 py-1 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                  Recent Sources
                </p>
                {sources.slice(0, 10).map((source) => {
                  currentIndex++;
                  const itemIndex = currentIndex;
                  return (
                    <button
                      key={source.id}
                      onClick={() =>
                        onSelect("source", source.id, source.title || source.url)
                      }
                      className={cn(
                        "w-full flex items-center gap-2.5 px-2 py-1.5 rounded-md text-left transition-colors",
                        selectedIndex === itemIndex
                          ? "bg-accent text-accent-foreground"
                          : "hover:bg-secondary"
                      )}
                    >
                      {source.type === "highlight" ? (
                        <Highlighter className="size-3.5 text-highlight shrink-0" />
                      ) : (
                        <Globe className="size-3.5 shrink-0" />
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm truncate">
                          {source.title || "Untitled"}
                        </p>
                        <p className="text-xs text-muted-foreground truncate">
                          {getDomain(source.url)}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}

            {folders.length === 0 && sources.length === 0 && (
              <div className="flex flex-col items-center justify-center py-6 px-4 text-center">
                <Search className="size-5 text-muted-foreground/50 mb-2" />
                <p className="text-sm font-medium text-foreground mb-1">Nothing to mention</p>
                <p className="text-xs text-muted-foreground">
                  Create folders or save sources first
                </p>
              </div>
            )}
          </div>
        )}
      </ScrollArea>
    </Card>
  );
}
