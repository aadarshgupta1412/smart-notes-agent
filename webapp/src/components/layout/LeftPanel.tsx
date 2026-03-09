"use client";

import { useState, useEffect, useCallback } from "react";
import { RefreshCw, ArrowLeft, LogOut } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import FolderList from "@/components/folders/FolderList";
import SourceList from "@/components/sources/SourceList";
import SourceDetail from "@/components/sources/SourceDetail";
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
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
        <div className="flex items-center gap-2">
          {state.view !== "folders" && (
            <button
              onClick={goBack}
              className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <ArrowLeft className="w-4 h-4 text-gray-500" />
            </button>
          )}
          <h2 className="font-semibold text-gray-900 truncate">{title}</h2>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <RefreshCw
              className={`w-4 h-4 text-gray-500 ${refreshing ? "animate-spin" : ""}`}
            />
          </button>
          <button
            onClick={handleSignOut}
            className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
            title="Sign out"
          >
            <LogOut className="w-4 h-4 text-gray-500" />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto scrollbar-thin">
        {state.view === "folders" && (
          <FolderList
            folders={folders}
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
    </div>
  );
}
