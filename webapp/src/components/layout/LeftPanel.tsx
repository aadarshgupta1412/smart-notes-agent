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
import { Separator } from "@/components/ui/separator";
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
      <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-sidebar">
        <div className="flex items-center gap-3">
          {state.view !== "folders" ? (
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={goBack} 
              className="size-8 hover:bg-accent"
            >
              <ArrowLeft className="size-4" />
            </Button>
          ) : (
            <div className="flex items-center gap-2">
              <div className="size-8 rounded-lg gradient-primary flex items-center justify-center">
                <BookOpen className="size-4 text-white" />
              </div>
            </div>
          )}
          <h2 className="font-semibold text-foreground truncate">{title}</h2>
        </div>
        <div className="flex items-center gap-1">
          <Tooltip>
            <TooltipTrigger>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleRefresh}
                disabled={refreshing}
                className="size-8 hover:bg-accent"
              >
                <RefreshCw className={`size-4 ${refreshing ? "animate-spin" : ""}`} />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Refresh</TooltipContent>
          </Tooltip>
          <ThemeToggle />
          <Separator orientation="vertical" className="h-5 mx-1" />
          <Tooltip>
            <TooltipTrigger>
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={handleSignOut} 
                className="size-8 hover:bg-destructive/10 hover:text-destructive"
              >
                <LogOut className="size-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Sign out</TooltipContent>
          </Tooltip>
        </div>
      </div>

      {/* Search bar - only show in folders view */}
      {state.view === "folders" && (
        <div className="px-4 py-3 border-b border-border/50">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input
              placeholder="Search folders..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 pr-12 h-10 bg-muted/50 border-border/50 focus:bg-background focus:border-primary/50 transition-colors"
            />
            <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-0.5">
              <kbd className="kbd">
                <Command className="size-3" />
              </kbd>
              <kbd className="kbd">K</kbd>
            </div>
          </div>
        </div>
      )}

      {/* Content area with smooth transitions */}
      <ScrollArea className="flex-1">
        <div className="animate-fade-in">
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
        </div>
      </ScrollArea>
    </div>
  );
}
