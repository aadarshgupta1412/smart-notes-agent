"use client";

import { RefreshCw, Globe, FileText, Loader2 } from "lucide-react";
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
    return new Date(dateStr).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  return (
    <div className="p-3 space-y-2">
      <div className="px-2 py-1">
        <p className="text-xs text-gray-400 uppercase tracking-wider font-medium">
          {sources.length} source{sources.length !== 1 ? "s" : ""} in {folder.name}
        </p>
      </div>

      {sources.length === 0 && (
        <p className="text-center text-sm text-gray-400 py-8">
          No sources in this folder yet. Use the extension to save content.
        </p>
      )}

      {sources.map((source) => (
        <button
          key={source.id}
          onClick={() => onSourceClick(source)}
          className="w-full flex items-start gap-3 px-4 py-3 bg-gray-50 rounded-xl hover:bg-indigo-50 border border-transparent hover:border-indigo-200 transition-all text-left group"
        >
          <div className="p-2 rounded-lg bg-gray-200 text-gray-600 group-hover:bg-indigo-100 group-hover:text-indigo-600 transition-colors mt-0.5">
            {source.type === "highlight" ? (
              <FileText className="w-4 h-4" />
            ) : (
              <Globe className="w-4 h-4" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-medium text-gray-900 truncate text-sm">
              {source.title || "Untitled"}
            </p>
            <p className="text-xs text-gray-400 truncate">{source.url}</p>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-xs text-gray-400">
                {formatDate(source.created_at)}
              </span>
              <span className="text-xs px-1.5 py-0.5 rounded bg-gray-200 text-gray-500">
                {source.type}
              </span>
            </div>
          </div>
          <button
            onClick={(e) => handleResync(e, source.id)}
            disabled={resyncingId === source.id}
            className="p-1.5 rounded-lg hover:bg-gray-200 transition-colors opacity-0 group-hover:opacity-100"
            title="Resync"
          >
            {resyncingId === source.id ? (
              <Loader2 className="w-4 h-4 animate-spin text-gray-400" />
            ) : (
              <RefreshCw className="w-4 h-4 text-gray-400" />
            )}
          </button>
        </button>
      ))}
    </div>
  );
}
