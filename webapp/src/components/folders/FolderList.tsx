"use client";

import { useState } from "react";
import { FolderIcon, Plus, Loader2 } from "lucide-react";
import type { Folder } from "@/lib/types";

interface Props {
  folders: Folder[];
  loading: boolean;
  onFolderClick: (folder: Folder) => void;
  onFolderCreated: () => void;
}

export default function FolderList({
  folders,
  loading,
  onFolderClick,
  onFolderCreated,
}: Props) {
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleCreate = async () => {
    if (!newName.trim()) return;
    setSubmitting(true);
    const res = await fetch("/api/folders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newName.trim() }),
    });
    if (res.ok) {
      setNewName("");
      setCreating(false);
      onFolderCreated();
    }
    setSubmitting(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="p-3 space-y-2">
      {/* Create folder button / form */}
      {creating ? (
        <div className="flex gap-2 p-2">
          <input
            autoFocus
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleCreate()}
            placeholder="Folder name..."
            className="flex-1 px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          <button
            onClick={handleCreate}
            disabled={submitting || !newName.trim()}
            className="px-3 py-2 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50"
          >
            {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : "Add"}
          </button>
          <button
            onClick={() => { setCreating(false); setNewName(""); }}
            className="px-3 py-2 text-sm text-gray-500 hover:text-gray-700"
          >
            Cancel
          </button>
        </div>
      ) : (
        <button
          onClick={() => setCreating(true)}
          className="w-full flex items-center gap-2 px-4 py-3 text-sm text-gray-500 border-2 border-dashed border-gray-200 rounded-xl hover:border-indigo-300 hover:text-indigo-600 transition-colors"
        >
          <Plus className="w-4 h-4" />
          New Folder
        </button>
      )}

      {/* Folder cards */}
      {folders.length === 0 && !creating && (
        <p className="text-center text-sm text-gray-400 py-8">
          No folders yet. Create one to get started.
        </p>
      )}

      {folders.map((folder) => (
        <button
          key={folder.id}
          onClick={() => onFolderClick(folder)}
          className="w-full flex items-center gap-3 px-4 py-3 bg-gray-50 rounded-xl hover:bg-indigo-50 hover:border-indigo-200 border border-transparent transition-all text-left group"
        >
          <div className="p-2 rounded-lg bg-indigo-100 text-indigo-600 group-hover:bg-indigo-200 transition-colors">
            <FolderIcon className="w-5 h-5" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-medium text-gray-900 truncate">{folder.name}</p>
            <p className="text-xs text-gray-500">
              {folder.source_count ?? 0} item{(folder.source_count ?? 0) !== 1 ? "s" : ""}
            </p>
          </div>
        </button>
      ))}
    </div>
  );
}
