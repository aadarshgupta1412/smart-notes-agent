"use client";

import { useState, useEffect, useCallback } from "react";
import { RefreshCw, ArrowLeft, LogOut, Search, BookOpen, Command } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import FolderList from "@/components/folders/FolderList";
import SourceList from "@/components/sources/SourceList";
import SourceDetail from "@/components/sources/SourceDetail";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import type { Folder, Source, ChatFilters } from "@/lib/types";

interface Props {
  onRefresh: () => void;
  onFiltersChange: (filters: ChatFilters) => void;
}

type PanelState =
  | { view: "folders" }
  | { view: "sources"; folder: Folder }
  | { view: "sourceDetail"; folder: Folder; source: Source };

export default function LeftPanel({ onRefresh, onFiltersChange }: Props) {
  const [state, setState] = useState<PanelState>({ view: "folders" });
  const [folders, setFolders] = useState<Folder[]>([]);
  const [sources, setSources] = useState<Source[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const router = useRouter();
  const supabase = createClient();

  const fetchFolders = useCallback(async () => {
    const res = await fetch("/api/folders");
    if (res.ok) {
      const data = await res.json();
      setFolders(data);
    }
    setLoading(false);
  }, []);

  const fetchSources = useCallback(async (folderId: string) => {
    const res = await fetch(`/api/sources?folderId=${folderId}`);
    if (res.ok) {
      setSources(await res.json());
    }
  }, []);

  useEffect(() => {
    fetchFolders();
  }, [fetchFolders]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchFolders();
    if (state.view !== "folders") {
      await fetchSources(state.folder.id);
    }
    setRefreshing(false);
    onRefresh();
  };

  const openFolder = async (folder: Folder) => {
    setState({ view: "sources", folder });
    await fetchSources(folder.id);
    onFiltersChange({ folderIds: [folder.id] });
  };

  const openSource = (source: Source) => {
    if (state.view === "sources") {
      setState({ view: "sourceDetail", folder: state.folder, source });
      onFiltersChange({ sourceIds: [source.id] });
    }
  };

  const goBack = () => {
    if (state.view === "sourceDetail") {
      setState({ view: "sources", folder: state.folder });
      onFiltersChange({ folderIds: [state.folder.id] });
    } else if (state.view === "sources") {
      setState({ view: "folders" });
      onFiltersChange({});
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push("/login");
  };

  const title =
    state.view === "folders"
      ? "Folders"
      : state.view === "sources"
        ? state.folder.name
        : state.source.title || "Source";

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-4 h-12 border-b border-border shrink-0">
        <div className="flex items-center gap-2.5 min-w-0">
          {state.view !== "folders" ? (
            <Button
              variant="ghost"
              size="icon"
              onClick={goBack}
              className="size-7 shrink-0 hover:bg-secondary hover:text-foreground"
            >
              <ArrowLeft className="size-3.5" />
            </Button>
          ) : (
            <div className="size-6 rounded bg-primary flex items-center justify-center shrink-0">
              <BookOpen className="size-3.5 text-primary-foreground" />
            </div>
          )}
          <h2 className="text-sm font-semibold text-foreground truncate">{title}</h2>
        </div>
        <div className="flex items-center gap-0.5">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleRefresh}
                disabled={refreshing}
                className="size-7 hover:bg-secondary"
              >
                <RefreshCw className={`size-3.5 ${refreshing ? "animate-spin" : ""}`} />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Refresh</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleSignOut}
                className="size-7 text-muted-foreground hover:text-destructive hover:bg-secondary"
              >
                <LogOut className="size-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Sign out</TooltipContent>
          </Tooltip>
        </div>
      </div>

      {/* Search bar — folders view only */}
      {state.view === "folders" && (
        <div className="px-3 py-2 border-b border-border shrink-0">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
            <Input
              placeholder="Search folders..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 pr-14 h-8 text-sm bg-secondary border-0 focus-visible:ring-1"
            />
            <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-0.5">
              <kbd className="kbd">
                <Command className="size-2.5" />
              </kbd>
              <kbd className="kbd">K</kbd>
            </div>
          </div>
        </div>
      )}

      {/* Content */}
      <ScrollArea className="flex-1">
        {state.view === "folders" && (
          <FolderList
            folders={folders.filter(f =>
              f.name.toLowerCase().includes(searchQuery.toLowerCase())
            )}
            loading={loading}
            onFolderClick={openFolder}
            onFolderCreated={fetchFolders}
          />
        )}
        {state.view === "sources" && (
          <SourceList
            sources={sources}
            folder={state.folder}
            onSourceClick={openSource}
            onRefresh={() => fetchSources(state.folder.id)}
          />
        )}
        {state.view === "sourceDetail" && (
          <SourceDetail source={state.source} />
        )}
      </ScrollArea>

      {/* Bottom bar — theme toggle */}
      <div className="px-3 py-2 border-t border-border shrink-0">
        <ThemeToggle />
      </div>
    </div>
  );
}
