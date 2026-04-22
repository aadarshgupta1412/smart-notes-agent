"use client";

import { useState } from "react";
import { FolderIcon, Plus, Loader2, FolderOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
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
  const [hoveredId, setHoveredId] = useState<string | null>(null);

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
      <div className="p-4 flex flex-col gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div 
            key={i} 
            className="flex items-center gap-3 px-4 py-3 rounded-xl bg-muted/30"
            style={{ animationDelay: `${i * 0.05}s` }}
          >
            <Skeleton className="size-11 rounded-xl" />
            <div className="flex-1 flex flex-col gap-2">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-3 w-1/3" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="p-4 flex flex-col gap-3">
      {/* Section header */}
      <div className="flex items-center justify-between px-1 mb-1">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Your Folders
        </h3>
        <Badge variant="secondary" className="text-xs">
          {folders.length}
        </Badge>
      </div>

      {/* Create folder form */}
      {creating ? (
        <div className="flex gap-2 p-3 rounded-xl bg-muted/50 border border-border/50 animate-fade-in">
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
            className="h-9 bg-background"
          />
          <Button
            size="sm"
            onClick={handleCreate}
            disabled={submitting || !newName.trim()}
            className="h-9 px-4"
          >
            {submitting ? <Loader2 className="size-4 animate-spin" /> : "Add"}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => { setCreating(false); setNewName(""); }}
            className="h-9"
          >
            Cancel
          </Button>
        </div>
      ) : (
        <Button
          variant="outline"
          className="w-full justify-start gap-3 border-dashed border-border/70 h-12 text-muted-foreground hover:text-primary hover:border-primary/50 hover:bg-primary/5 transition-all duration-200"
          onClick={() => setCreating(true)}
        >
          <div className="size-8 rounded-lg bg-muted flex items-center justify-center">
            <Plus className="size-4" />
          </div>
          New Folder
        </Button>
      )}

      {/* Empty state */}
      {folders.length === 0 && !creating && (
        <div className="flex flex-col items-center justify-center py-12 px-4 text-center animate-fade-in">
          <div className="size-16 rounded-2xl bg-muted/50 flex items-center justify-center mb-4">
            <FolderIcon className="size-8 text-muted-foreground" />
          </div>
          <p className="text-sm font-medium text-foreground mb-1">No folders yet</p>
          <p className="text-xs text-muted-foreground">
            Create your first folder to organize your knowledge
          </p>
        </div>
      )}

      {/* Folder grid */}
      <div className="grid grid-cols-1 gap-2">
        {folders.map((folder, index) => (
          <button
            key={folder.id}
            onClick={() => onFolderClick(folder)}
            onMouseEnter={() => setHoveredId(folder.id)}
            onMouseLeave={() => setHoveredId(null)}
            className={cn(
              "w-full flex items-center gap-3 px-4 py-3 rounded-xl",
              "bg-card border border-border/50",
              "hover:border-primary/30 hover:shadow-md",
              "transition-all duration-200 text-left group",
              "animate-fade-in"
            )}
            style={{ animationDelay: `${index * 0.03}s` }}
          >
            <div className={cn(
              "size-11 flex items-center justify-center rounded-xl transition-all duration-200",
              hoveredId === folder.id 
                ? "bg-primary text-primary-foreground shadow-md" 
                : "bg-indigo-100 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400"
            )}>
              {hoveredId === folder.id ? (
                <FolderOpen className="size-5" />
              ) : (
                <FolderIcon className="size-5" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-foreground truncate group-hover:text-primary transition-colors">
                {folder.name}
              </p>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-xs text-muted-foreground">
                  {folder.source_count ?? 0} item{(folder.source_count ?? 0) !== 1 ? "s" : ""}
                </span>
              </div>
            </div>
            <div className={cn(
              "size-6 rounded-full flex items-center justify-center",
              "bg-muted/50 text-muted-foreground",
              "opacity-0 group-hover:opacity-100 transition-opacity"
            )}>
              <svg className="size-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
