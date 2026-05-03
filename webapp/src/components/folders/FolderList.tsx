"use client";

import { useState } from "react";
import { FolderIcon, Plus, Loader2, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
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
      <div className="p-3 flex flex-col gap-1">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3 px-3 py-2.5">
            <Skeleton className="size-8 rounded-md" />
            <div className="flex-1 flex flex-col gap-1.5">
              <Skeleton className="h-3.5 w-3/4" />
              <Skeleton className="h-3 w-1/3" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="p-3 flex flex-col gap-1">
      {/* Section header */}
      <div className="flex items-center justify-between px-3 mb-1">
        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
          Your Folders
        </span>
        <span className="text-xs text-muted-foreground">{folders.length}</span>
      </div>

      {/* Create folder */}
      {creating ? (
        <div className="flex gap-2 px-3 py-2">
          <Input
            autoFocus
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleCreate();
              if (e.key === "Escape") { setCreating(false); setNewName(""); }
            }}
            placeholder="Folder name..."
            className="h-8 text-sm"
          />
          <Button
            size="sm"
            onClick={handleCreate}
            disabled={submitting || !newName.trim()}
            className="h-8 px-3 text-xs"
          >
            {submitting ? <Loader2 className="size-3.5 animate-spin" /> : "Add"}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => { setCreating(false); setNewName(""); }}
            className="h-8 px-2 text-xs"
          >
            Cancel
          </Button>
        </div>
      ) : (
        <button
          className="flex items-center gap-3 px-3 py-2 rounded-md text-sm text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors border border-dashed border-border"
          onClick={() => setCreating(true)}
        >
          <Plus className="size-4" />
          <span>New Folder</span>
        </button>
      )}

      {/* Empty state */}
      {folders.length === 0 && !creating && (
        <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
          <FolderIcon className="size-8 text-muted-foreground/50 mb-3" />
          <p className="text-sm font-medium text-foreground mb-1">No folders yet</p>
          <p className="text-xs text-muted-foreground">
            Create a folder to organize your knowledge
          </p>
        </div>
      )}

      {/* Folder list */}
      <div className="flex flex-col gap-0.5">
        {folders.map((folder) => (
          <button
            key={folder.id}
            onClick={() => onFolderClick(folder)}
            className={cn(
              "w-full flex items-center gap-3 px-3 py-2.5 rounded-md",
              "hover:bg-secondary transition-colors text-left group"
            )}
          >
            <FolderIcon className="size-4 text-muted-foreground group-hover:text-primary shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm text-foreground truncate">
                {folder.name}
              </p>
              <p className="text-xs text-muted-foreground">
                {folder.source_count ?? 0} item{(folder.source_count ?? 0) !== 1 ? "s" : ""}
              </p>
            </div>
            <ChevronRight className="size-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
          </button>
        ))}
      </div>
    </div>
  );
}
