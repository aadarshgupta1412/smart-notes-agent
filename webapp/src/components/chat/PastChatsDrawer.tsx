"use client";

import { useState, useEffect } from "react";
import { X, MessageSquare, Trash2, Loader2 } from "lucide-react";
import type { Chat } from "@/lib/types";

interface Props {
  open: boolean;
  onClose: () => void;
  onSelectChat: (chat: Chat) => void;
}

export default function PastChatsDrawer({ open, onClose, onSelectChat }: Props) {
  const [chats, setChats] = useState<Chat[]>([]);
  const [loading, setLoading] = useState(false);

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

  if (!open) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/20 z-40"
        onClick={onClose}
      />

      {/* Drawer */}
      <div className="fixed right-0 top-0 bottom-0 w-80 bg-white shadow-2xl z-50 flex flex-col">
        <div className="flex items-center justify-between px-4 py-3 border-b">
          <h3 className="font-semibold text-gray-900">Chat History</h3>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <X className="w-4 h-4 text-gray-500" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto scrollbar-thin">
          {loading && (
            <div className="flex justify-center py-8">
              <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
            </div>
          )}

          {!loading && chats.length === 0 && (
            <p className="text-center text-sm text-gray-400 py-8">No chats yet</p>
          )}

          {chats.map((chat) => (
            <button
              key={chat.id}
              onClick={() => onSelectChat(chat)}
              className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors text-left group"
            >
              <MessageSquare className="w-4 h-4 text-gray-400 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">
                  {chat.title}
                </p>
                <p className="text-xs text-gray-400">
                  {new Date(chat.updated_at).toLocaleDateString()}
                </p>
              </div>
              <button
                onClick={(e) => handleDelete(e, chat.id)}
                className="p-1 rounded opacity-0 group-hover:opacity-100 hover:bg-gray-200 transition-all"
              >
                <Trash2 className="w-3.5 h-3.5 text-gray-400" />
              </button>
            </button>
          ))}
        </div>
      </div>
    </>
  );
}
