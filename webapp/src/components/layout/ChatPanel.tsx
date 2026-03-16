"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Menu, Plus, Send, Loader2, Sparkles, X } from "lucide-react";
import PastChatsDrawer from "@/components/chat/PastChatsDrawer";
import MentionDropdown from "@/components/chat/MentionDropdown";
import type { Chat, ChatFilters, Message } from "@/lib/types";

interface Props {
  filters: ChatFilters;
  activeChatId: string | null;
  onChatChange: (chatId: string | null) => void;
}

export default function ChatPanel({ filters, activeChatId, onChatChange }: Props) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [chatTitle, setChatTitle] = useState("New Chat");
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [showMention, setShowMention] = useState(false);
  const [mentionFilters, setMentionFilters] = useState<ChatFilters>({});
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const effectiveFilters: ChatFilters = {
    folderIds: [
      ...(filters.folderIds || []),
      ...(mentionFilters.folderIds || []),
    ].filter(Boolean),
    sourceIds: [
      ...(filters.sourceIds || []),
      ...(mentionFilters.sourceIds || []),
    ].filter(Boolean),
  };

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  useEffect(() => {
    if (!activeChatId) {
      setMessages([]);
      setChatTitle("New Chat");
      return;
    }
    async function loadChat() {
      const res = await fetch(`/api/chats/${activeChatId}`);
      if (res.ok) {
        const data = await res.json();
        setChatTitle(data.title);
        setMessages(data.messages || []);
      }
    }
    loadChat();
  }, [activeChatId]);

  const createNewChat = async (): Promise<string> => {
    const res = await fetch("/api/chats", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: input.slice(0, 50) || "New Chat" }),
    });
    const data = await res.json();
    onChatChange(data.id);
    setChatTitle(data.title);
    return data.id;
  };

  const handleSend = async () => {
    if (!input.trim() || isStreaming) return;

    const userMessage = input.trim();
    setInput("");
    setShowMention(false);

    let chatId = activeChatId;
    if (!chatId) {
      chatId = await createNewChat();
    }

    const userMsg: Message = {
      id: crypto.randomUUID(),
      chat_id: chatId,
      user_id: "",
      role: "user",
      content: userMessage,
      created_at: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, userMsg]);

    setIsStreaming(true);

    const assistantMsg: Message = {
      id: crypto.randomUUID(),
      chat_id: chatId,
      user_id: "",
      role: "assistant",
      content: "",
      created_at: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, assistantMsg]);

    try {
      const res = await fetch(`/api/chats/${chatId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: userMessage,
          filters:
            effectiveFilters.folderIds?.length || effectiveFilters.sourceIds?.length
              ? effectiveFilters
              : undefined,
        }),
      });

      if (!res.ok) {
        throw new Error("Failed to send message");
      }

      const reader = res.body?.getReader();
      const decoder = new TextDecoder();
      let accumulated = "";

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value, { stream: true });
          const lines = chunk.split("\n");

          for (const line of lines) {
            if (line.startsWith("0:")) {
              try {
                const textContent = JSON.parse(line.slice(2));
                accumulated += textContent;
                setMessages((prev) => {
                  const updated = [...prev];
                  const lastMsg = updated[updated.length - 1];
                  if (lastMsg.role === "assistant") {
                    updated[updated.length - 1] = {
                      ...lastMsg,
                      content: accumulated,
                    };
                  }
                  return updated;
                });
              } catch {
                // skip non-text stream events
              }
            }
          }
        }
      }
    } catch (err) {
      console.error("Chat error:", err);
      setMessages((prev) => {
        const updated = [...prev];
        const lastMsg = updated[updated.length - 1];
        if (lastMsg.role === "assistant" && !lastMsg.content) {
          updated[updated.length - 1] = {
            ...lastMsg,
            content: "Sorry, something went wrong. Please try again.",
          };
        }
        return updated;
      });
    }

    setIsStreaming(false);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setInput(val);

    const lastAtIdx = val.lastIndexOf("@");
    if (lastAtIdx >= 0 && lastAtIdx === val.length - 1) {
      setShowMention(true);
    } else if (lastAtIdx >= 0) {
      const afterAt = val.slice(lastAtIdx + 1);
      if (!afterAt.includes(" ")) {
        setShowMention(true);
      } else {
        setShowMention(false);
      }
    } else {
      setShowMention(false);
    }
  };

  const handleMentionSelect = (
    type: "folder" | "source",
    id: string,
    name: string
  ) => {
    if (type === "folder") {
      setMentionFilters((prev) => ({
        ...prev,
        folderIds: [...new Set([...(prev.folderIds || []), id])],
      }));
    } else {
      setMentionFilters((prev) => ({
        ...prev,
        sourceIds: [...new Set([...(prev.sourceIds || []), id])],
      }));
    }

    const lastAtIdx = input.lastIndexOf("@");
    const before = input.slice(0, lastAtIdx);
    setInput(`${before}@${name} `);
    setShowMention(false);
    inputRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleNewChat = () => {
    onChatChange(null);
    setMessages([]);
    setChatTitle("New Chat");
    setMentionFilters({});
    setInput("");
  };

  const activeMentions = [
    ...(mentionFilters.folderIds || []).map((id) => ({ type: "folder" as const, id })),
    ...(mentionFilters.sourceIds || []).map((id) => ({ type: "source" as const, id })),
  ];

  return (
    <div className="flex flex-col h-full relative">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 bg-white">
        <button
          onClick={handleNewChat}
          className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
          title="New chat"
        >
          <Plus className="w-4 h-4 text-gray-500" />
        </button>
        <h2 className="font-semibold text-gray-900 truncate">{chatTitle}</h2>
        <button
          onClick={() => setDrawerOpen(true)}
          className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
          title="Past chats"
        >
          <Menu className="w-4 h-4 text-gray-500" />
        </button>
      </div>

      {/* Messages area */}
      <div className="flex-1 overflow-y-auto px-4 py-6 space-y-4 scrollbar-thin">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div className="p-4 rounded-2xl bg-indigo-50 mb-4">
              <Sparkles className="w-8 h-8 text-indigo-500" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900">Ask AI</h3>
            <p className="text-sm text-gray-500 mt-1 max-w-sm">
              Chat with your saved knowledge. Use @folder or @source to scope the search.
            </p>
          </div>
        )}

        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-[80%] px-4 py-3 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap ${
                msg.role === "user"
                  ? "bg-indigo-600 text-white"
                  : "bg-gray-100 text-gray-800"
              }`}
            >
              {msg.content || (
                <Loader2 className="w-4 h-4 animate-spin text-gray-400" />
              )}
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Active mention filters */}
      {activeMentions.length > 0 && (
        <div className="px-4 py-2 border-t border-gray-100 bg-gray-50 flex flex-wrap gap-1">
          {activeMentions.map((m) => (
            <span
              key={`${m.type}-${m.id}`}
              className="inline-flex items-center gap-1 px-2 py-1 text-xs bg-indigo-100 text-indigo-700 rounded-full"
            >
              @{m.type}
              <button
                onClick={() => {
                  if (m.type === "folder") {
                    setMentionFilters((prev) => ({
                      ...prev,
                      folderIds: prev.folderIds?.filter((fid) => fid !== m.id),
                    }));
                  } else {
                    setMentionFilters((prev) => ({
                      ...prev,
                      sourceIds: prev.sourceIds?.filter((sid) => sid !== m.id),
                    }));
                  }
                }}
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          ))}
        </div>
      )}

      {/* Input area */}
      <div className="p-4 border-t border-gray-200 bg-white relative">
        {showMention && (
          <div className="absolute bottom-full left-4 right-4 mb-2 z-10">
            <MentionDropdown
              onSelect={handleMentionSelect}
              onClose={() => setShowMention(false)}
            />
          </div>
        )}
        <div className="flex items-end gap-2">
          <textarea
            ref={inputRef}
            value={input}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            placeholder="Ask about your saved knowledge... (@ to scope)"
            rows={1}
            className="flex-1 resize-none px-4 py-3 bg-gray-100 rounded-xl border border-transparent focus:border-indigo-300 focus:bg-white focus:outline-none text-sm max-h-32 overflow-y-auto"
            style={{ minHeight: "44px" }}
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || isStreaming}
            className="p-3 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isStreaming ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </button>
        </div>
      </div>

      {/* Past chats drawer */}
      <PastChatsDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        onSelectChat={(chat: Chat) => {
          onChatChange(chat.id);
          setDrawerOpen(false);
        }}
      />
    </div>
  );
}
