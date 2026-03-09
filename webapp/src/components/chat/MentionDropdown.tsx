"use client";

import { useState, useEffect } from "react";
import { FolderIcon, Globe, Loader2 } from "lucide-react";
import type { Folder, Source } from "@/lib/types";

interface Props {
  onSelect: (type: "folder" | "source", id: string, name: string) => void;
  onClose: () => void;
}

export default function MentionDropdown({ onSelect, onClose }: Props) {
  const [folders, setFolders] = useState<Folder[]>([]);
  const [sources, setSources] = useState<Source[]>([]);
  const [loading, setLoading] = useState(true);

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

  return (
    <div
      className="bg-white border border-gray-200 rounded-xl shadow-lg max-h-64 overflow-y-auto"
      onClick={(e) => e.stopPropagation()}
    >
      {loading ? (
        <div className="flex justify-center py-4">
          <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
        </div>
      ) : (
        <>
          {folders.length > 0 && (
            <div>
              <p className="px-3 py-2 text-xs text-gray-400 uppercase tracking-wider font-medium bg-gray-50">
                Folders
              </p>
              {folders.map((folder) => (
                <button
                  key={folder.id}
                  onClick={() => onSelect("folder", folder.id, folder.name)}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-indigo-50 transition-colors text-left"
                >
                  <FolderIcon className="w-4 h-4 text-indigo-500" />
                  <span className="truncate">{folder.name}</span>
                </button>
              ))}
            </div>
          )}

          {sources.length > 0 && (
            <div>
              <p className="px-3 py-2 text-xs text-gray-400 uppercase tracking-wider font-medium bg-gray-50">
                Sources
              </p>
              {sources.slice(0, 10).map((source) => (
                <button
                  key={source.id}
                  onClick={() =>
                    onSelect("source", source.id, source.title || source.url)
                  }
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-indigo-50 transition-colors text-left"
                >
                  <Globe className="w-4 h-4 text-gray-400" />
                  <span className="truncate">{source.title || source.url}</span>
                </button>
              ))}
            </div>
          )}

          {folders.length === 0 && sources.length === 0 && (
            <p className="px-3 py-4 text-sm text-gray-400 text-center">
              No folders or sources yet
            </p>
          )}
        </>
      )}
    </div>
  );
}
