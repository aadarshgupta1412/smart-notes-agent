"use client";

import { useState, useEffect } from "react";
import { MessageSquare, Trash2, Clock, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import type { Chat } from "@/lib/types";

interface Props {
  open: boolean;
  onClose: () => void;
  onSelectChat: (chat: Chat) => void;
}

export default function PastChatsDrawer({ open, onClose, onSelectChat }: Props) {
  const [chats, setChats] = useState<Chat[]>([]);
  const [loading, setLoading] = useState(false);
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setLoading(true);
      fetch("/api/chats")
        .then((res) => res.json())
        .then((data) => setChats(data))
        .catch(console.error)
        .finally(() => setLoading(false));
    }
  }, [open]);

  const handleDelete = async (e: React.MouseEvent, chatId: string) => {
    e.stopPropagation();
    await fetch(`/api/chats/${chatId}`, { method: "DELETE" });
    setChats((prev) => prev.filter((c) => c.id !== chatId));
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return "Today";
    if (diffDays === 1) return "Yesterday";
    if (diffDays < 7) return `${diffDays} days ago`;
    
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });
  };

  return (
    <Sheet open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <SheetContent side="right" className="w-80 p-0 border-l border-border/50">
        <SheetHeader className="px-4 py-4 border-b border-border/50 bg-card/50">
          <SheetTitle className="flex items-center gap-2 text-base">
            <Clock className="size-4 text-muted-foreground" />
            Chat History
          </SheetTitle>
        </SheetHeader>

        <ScrollArea className="h-[calc(100vh-65px)]">
          <div className="p-3">
            {/* Loading state */}
            {loading && (
              <div className="flex flex-col gap-2">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div 
                    key={i} 
                    className="flex items-center gap-3 px-3 py-3 rounded-xl bg-muted/30"
                    style={{ animationDelay: `${i * 0.05}s` }}
                  >
                    <Skeleton className="size-9 rounded-lg" />
                    <div className="flex-1 flex flex-col gap-2">
                      <Skeleton className="h-4 w-3/4" />
                      <Skeleton className="h-3 w-1/3" />
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Empty state */}
            {!loading && chats.length === 0 && (
              <div className="flex flex-col items-center justify-center py-16 px-4 text-center animate-fade-in">
                <div className="size-14 rounded-2xl bg-muted/50 flex items-center justify-center mb-4">
                  <MessageSquare className="size-7 text-muted-foreground" />
                </div>
                <p className="text-sm font-medium text-foreground mb-1">No chats yet</p>
                <p className="text-xs text-muted-foreground">
                  Start a conversation to see it here
                </p>
              </div>
            )}

            {/* Chat list */}
            {!loading && chats.length > 0 && (
              <div className="flex flex-col gap-1">
                {chats.map((chat, index) => (
                  <button
                    key={chat.id}
                    onClick={() => onSelectChat(chat)}
                    onMouseEnter={() => setHoveredId(chat.id)}
                    onMouseLeave={() => setHoveredId(null)}
                    className={cn(
                      "w-full flex items-center gap-3 px-3 py-3 rounded-xl",
                      "hover:bg-accent transition-all duration-200 text-left group",
                      "animate-fade-in"
                    )}
                    style={{ animationDelay: `${index * 0.03}s` }}
                  >
                    <div className={cn(
                      "size-9 rounded-lg flex items-center justify-center transition-all duration-200 flex-shrink-0",
                      hoveredId === chat.id
                        ? "gradient-primary text-white shadow-md"
                        : "bg-muted text-muted-foreground"
                    )}>
                      {hoveredId === chat.id ? (
                        <Sparkles className="size-4" />
                      ) : (
                        <MessageSquare className="size-4" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate group-hover:text-primary transition-colors">
                        {chat.title}
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {formatDate(chat.updated_at)}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className={cn(
                        "size-8 opacity-0 group-hover:opacity-100 transition-all duration-200",
                        "hover:bg-destructive/10 hover:text-destructive"
                      )}
                      onClick={(e) => handleDelete(e, chat.id)}
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </button>
                ))}
              </div>
            )}
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
