"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { History, Plus, Send, X, MessageSquare, Square, RotateCcw } from "lucide-react";
import PastChatsDrawer from "@/components/chat/PastChatsDrawer";
import MentionDropdown from "@/components/chat/MentionDropdown";
import MarkdownRenderer from "@/components/chat/MarkdownRenderer";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { OrbitRing } from "@/components/loading-ui/orbit-ring";
import { cn } from "@/lib/utils";
import type { Chat, ChatFilters, Message } from "@/lib/types";

interface Props {
  filters: ChatFilters;
  activeChatId: string | null;
  onChatChange: (chatId: string | null) => void;
}

function TypingIndicator() {
  return (
    <div className="flex items-center gap-2.5 py-2">
      <OrbitRing className="size-5 text-primary" style={{ "--duration": "0.8s" } as React.CSSProperties} />
      <span className="text-sm italic shimmer-text">
        firing neurons...
      </span>
    </div>
  );
}

const SUGGESTED_PROMPTS = [
  "Summarize my recent highlights",
  "What are the key insights from my bookmarks?",
  "Find articles about AI",
];

export default function ChatPanel({ filters, activeChatId, onChatChange }: Props) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [chatTitle, setChatTitle] = useState("New Chat");
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [showMention, setShowMention] = useState(false);
  const [mentionFilters, setMentionFilters] = useState<ChatFilters>({});
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [failedMessage, setFailedMessage] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const scrollViewportRef = useRef<HTMLElement | null>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  // Internal chat ID — avoids race conditions with URL-driven re-renders
  const [localChatId, setLocalChatId] = useState<string | null>(activeChatId);
  const streamingChatIdRef = useRef<string | null>(null);

  // Track whether user has manually scrolled up during streaming
  const userScrolledUpRef = useRef(false);

  // Sync prop → local only when NOT mid-stream
  useEffect(() => {
    if (!streamingChatIdRef.current) {
      setLocalChatId(activeChatId);
    }
  }, [activeChatId]);

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

  // Grab the scrollable viewport scoped to THIS chat panel
  useEffect(() => {
    const container = chatContainerRef.current;
    if (!container) return;
    const vp = container.querySelector('[data-slot="scroll-area-viewport"]');
    if (vp) scrollViewportRef.current = vp as HTMLElement;
  }, []);

  // Detect when user scrolls up during streaming
  useEffect(() => {
    const viewport = scrollViewportRef.current;
    if (!viewport) return;

    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = viewport;
      const distanceFromBottom = scrollHeight - scrollTop - clientHeight;

      if (isStreaming && distanceFromBottom > 80) {
        userScrolledUpRef.current = true;
      } else if (distanceFromBottom < 30) {
        userScrolledUpRef.current = false;
      }
    };

    viewport.addEventListener("scroll", handleScroll, { passive: true });
    return () => viewport.removeEventListener("scroll", handleScroll);
  }, [isStreaming]);

  const scrollToBottom = useCallback((instant?: boolean) => {
    const viewport = scrollViewportRef.current;
    if (!viewport) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
      return;
    }
    viewport.scrollTo({
      top: viewport.scrollHeight,
      behavior: instant ? "instant" : "smooth",
    });
  }, []);

  // Scroll on new messages (non-streaming: user sends, chat loads)
  useEffect(() => {
    if (!isStreaming) {
      scrollToBottom(false);
    }
  }, [messages, isStreaming, scrollToBottom]);

  const handleStop = useCallback(() => {
    abortRef.current?.abort();
    setIsStreaming(false);
  }, []);

  const adjustHeight = useCallback(() => {
    const el = inputRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 128) + "px";
  }, []);

  // Load chat when localChatId changes — skip if we're streaming into it
  useEffect(() => {
    if (!localChatId) {
      setMessages([]);
      setChatTitle("New Chat");
      return;
    }
    if (streamingChatIdRef.current === localChatId) return;

    let cancelled = false;
    async function loadChat() {
      const res = await fetch(`/api/chats/${localChatId}`);
      if (res.ok && !cancelled) {
        const data = await res.json();
        setChatTitle(data.title);
        setMessages(data.messages || []);
      }
    }
    loadChat();
    return () => { cancelled = true; };
  }, [localChatId]);

  const handleSend = async (messageOverride?: string) => {
    const messageToSend = messageOverride || input.trim();
    if (!messageToSend || isStreaming) return;

    setInput("");
    setShowMention(false);
    setFailedMessage(null);

    // Reset textarea height
    if (inputRef.current) {
      inputRef.current.style.height = "auto";
    }

    let chatId = localChatId;

    if (!chatId) {
      const res = await fetch("/api/chats", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: messageToSend.slice(0, 50) }),
      });
      const data = await res.json();
      chatId = data.id as string;
      setChatTitle(data.title);
    }

    const resolvedChatId = chatId;

    streamingChatIdRef.current = resolvedChatId;
    setLocalChatId(resolvedChatId);
    userScrolledUpRef.current = false;

    const userMsg: Message = {
      id: crypto.randomUUID(),
      chat_id: resolvedChatId,
      user_id: "",
      role: "user",
      content: messageToSend,
      created_at: new Date().toISOString(),
    };
    const assistantMsg: Message = {
      id: crypto.randomUUID(),
      chat_id: resolvedChatId,
      user_id: "",
      role: "assistant",
      content: "",
      created_at: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMsg, assistantMsg]);
    setIsStreaming(true);
    onChatChange(resolvedChatId);

    // Throttled streaming: flush accumulated text to React every FLUSH_MS
    const FLUSH_MS = 8;
    let accumulated = "";
    let flushTimer: ReturnType<typeof setTimeout> | null = null;
    let lastFlushTime = 0;

    const flushToReact = () => {
      flushTimer = null;
      lastFlushTime = Date.now();
      const snapshot = accumulated;
      setMessages((prev) => {
        const updated = [...prev];
        const lastMsg = updated[updated.length - 1];
        if (lastMsg?.role === "assistant") {
          updated[updated.length - 1] = { ...lastMsg, content: snapshot };
        }
        return updated;
      });
      if (!userScrolledUpRef.current) {
        scrollToBottom(true);
      }
    };

    const scheduleFlush = () => {
      if (flushTimer) return;
      const elapsed = Date.now() - lastFlushTime;
      if (elapsed >= FLUSH_MS) {
        flushToReact();
      } else {
        flushTimer = setTimeout(flushToReact, FLUSH_MS - elapsed);
      }
    };

    try {
      abortRef.current = new AbortController();
      const res = await fetch(`/api/chats/${resolvedChatId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: messageToSend,
          filters:
            effectiveFilters.folderIds?.length || effectiveFilters.sourceIds?.length
              ? effectiveFilters
              : undefined,
        }),
        signal: abortRef.current.signal,
      });

      if (!res.ok) throw new Error("Failed to send message");

      const reader = res.body?.getReader();
      const decoder = new TextDecoder();

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          accumulated += decoder.decode(value, { stream: true });
          scheduleFlush();
        }
      }

      // Final flush to ensure all content is rendered
      if (flushTimer) clearTimeout(flushTimer);
      flushToReact();
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") {
        // User cancelled — keep partial content
      } else {
        console.error("Chat error:", err);
        setFailedMessage(messageToSend);
        if (flushTimer) clearTimeout(flushTimer);
        setMessages((prev) => {
          const updated = [...prev];
          const lastMsg = updated[updated.length - 1];
          if (lastMsg?.role === "assistant" && !lastMsg.content) {
            updated[updated.length - 1] = {
              ...lastMsg,
              content: "Sorry, something went wrong. Please try again.",
            };
          }
          return updated;
        });
      }
    }

    streamingChatIdRef.current = null;
    setIsStreaming(false);
    // Final smooth scroll after streaming ends
    if (!userScrolledUpRef.current) {
      requestAnimationFrame(() => scrollToBottom(false));
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setInput(val);
    adjustHeight();

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
    streamingChatIdRef.current = null;
    setLocalChatId(null);
    onChatChange(null);
    setMessages([]);
    setChatTitle("New Chat");
    setMentionFilters({});
    setInput("");
    setFailedMessage(null);
  };

  const handleRenameChat = async (newTitle: string) => {
    const trimmed = newTitle.trim();
    if (!trimmed || !localChatId) {
      setIsEditingTitle(false);
      return;
    }
    setChatTitle(trimmed);
    setIsEditingTitle(false);
    await fetch(`/api/chats/${localChatId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: trimmed }),
    });
  };

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const mod = e.metaKey || e.ctrlKey;
      if (mod && e.key === "n") {
        e.preventDefault();
        handleNewChat();
      }
      if (mod && e.key === "k") {
        e.preventDefault();
        inputRef.current?.focus();
      }
      if (e.key === "Escape") {
        if (drawerOpen) setDrawerOpen(false);
        else inputRef.current?.blur();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [drawerOpen]);

  const activeMentions = [
    ...(mentionFilters.folderIds || []).map((id) => ({ type: "folder" as const, id })),
    ...(mentionFilters.sourceIds || []).map((id) => ({ type: "source" as const, id })),
  ];

  return (
    <div ref={chatContainerRef} className="relative flex flex-col h-full bg-background overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 h-12 border-b border-border shrink-0">
        <Button
          variant="ghost"
          size="icon"
          onClick={handleNewChat}
          className="size-8 hover:bg-secondary"
          title="New chat"
        >
          <Plus className="size-4" />
        </Button>

        {isEditingTitle ? (
          <input
            autoFocus
            defaultValue={chatTitle}
            className="text-sm font-medium text-foreground bg-transparent border-b border-primary outline-none px-1 max-w-[200px] text-center"
            onBlur={(e) => handleRenameChat(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleRenameChat(e.currentTarget.value);
              if (e.key === "Escape") setIsEditingTitle(false);
            }}
          />
        ) : (
          <span
            className="text-sm font-medium text-foreground truncate px-4 cursor-default"
            onDoubleClick={() => localChatId && setIsEditingTitle(true)}
            title={localChatId ? "Double-click to rename" : undefined}
          >
            {chatTitle}
          </span>
        )}

        <Button
          variant="ghost"
          size="icon"
          onClick={() => setDrawerOpen(true)}
          className="size-8 hover:bg-secondary"
          title="Chat history"
        >
          <History className="size-4" />
        </Button>
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1">
        <div className="px-4 py-6 max-w-2xl mx-auto">
          <div className="flex flex-col gap-4">
            {messages.length === 0 && (
              <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
                <div className="size-10 rounded-lg bg-secondary flex items-center justify-center mb-4">
                  <MessageSquare className="size-5 text-muted-foreground" />
                </div>
                <h3 className="text-base font-semibold text-foreground mb-1">
                  Ask about your knowledge
                </h3>
                <p className="text-sm text-muted-foreground max-w-sm mb-6">
                  Chat with your saved highlights and bookmarks.
                  Type <kbd className="kbd">@</kbd> to scope your search.
                </p>
                <div className="flex flex-wrap justify-center gap-2">
                  {SUGGESTED_PROMPTS.map((prompt, i) => (
                    <button
                      key={i}
                      onClick={() => handleSend(prompt)}
                      className="px-3 py-1.5 text-xs rounded-md border border-border bg-card text-text-secondary hover:bg-secondary hover:text-foreground transition-colors"
                    >
                      {prompt}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {messages.map((msg, index) => {
              const isLastAssistantMessage = msg.role === "assistant" && index === messages.length - 1;
              const isCurrentlyStreaming = isStreaming && isLastAssistantMessage;

              if (msg.role === "user") {
                return (
                  <div key={msg.id} className="flex justify-end">
                    <div className="max-w-[80%] px-3.5 py-2.5 text-sm leading-relaxed bg-chat-user text-chat-user-foreground rounded-2xl rounded-br-md">
                      {msg.content}
                    </div>
                  </div>
                );
              }

              return (
                <div key={msg.id} className="text-sm leading-relaxed text-foreground">
                  {msg.content ? (
                    <MarkdownRenderer
                      content={msg.content}
                      isStreaming={isCurrentlyStreaming}
                    />
                  ) : (
                    <TypingIndicator />
                  )}
                  {failedMessage && isLastAssistantMessage && !isStreaming && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="mt-2 gap-1.5 text-xs text-muted-foreground hover:text-foreground"
                      onClick={() => {
                        const msg = failedMessage;
                        setFailedMessage(null);
                        handleSend(msg);
                      }}
                    >
                      <RotateCcw className="size-3" />
                      Retry
                    </Button>
                  )}
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </div>
        </div>
      </ScrollArea>

      {/* Active mentions */}
      {activeMentions.length > 0 && (
        <div className="px-4 py-2 border-t border-border flex flex-wrap items-center gap-2">
          <span className="text-xs text-muted-foreground">Scope:</span>
          {activeMentions.map((m) => (
            <Badge
              key={`${m.type}-${m.id}`}
              variant="secondary"
              className="gap-1 pr-1 text-xs"
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
                className="ml-0.5 rounded-sm hover:bg-border p-0.5 transition-colors"
              >
                <X className="size-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}

      {/* Input */}
      <div className="p-3 border-t border-border relative shrink-0">
        {showMention && (
          <div className="absolute bottom-full left-3 right-3 mb-2 z-10">
            <MentionDropdown
              onSelect={handleMentionSelect}
              onClose={() => setShowMention(false)}
            />
          </div>
        )}

        <div className="max-w-2xl mx-auto">
          <div className="flex items-end gap-2">
            <div className="flex-1 relative">
              <textarea
                ref={inputRef}
                value={input}
                onChange={handleInputChange}
                onKeyDown={handleKeyDown}
                placeholder="Ask about your saved knowledge..."
                rows={1}
                className={cn(
                  "w-full resize-none px-3 py-2.5",
                  "bg-secondary rounded-lg border border-border",
                  "focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/30",
                  "text-sm max-h-32 overflow-y-auto",
                  "transition-colors",
                  "placeholder:text-muted-foreground"
                )}
                style={{ minHeight: "40px" }}
              />
            </div>
            <Button
              size="icon"
              onClick={() => isStreaming ? handleStop() : handleSend()}
              disabled={!isStreaming && !input.trim()}
              className="size-10 rounded-lg shrink-0 hover:bg-primary-hover"
              title={isStreaming ? "Stop generating" : "Send message"}
            >
              {isStreaming ? (
                <Square className="size-4" />
              ) : (
                <Send className="size-4" />
              )}
            </Button>
          </div>
          <p className="text-[11px] text-muted-foreground text-center mt-2">
            <kbd className="kbd">Enter</kbd> to send &middot; <kbd className="kbd">Shift+Enter</kbd> for new line &middot; <kbd className="kbd">@</kbd> to mention &middot; <kbd className="kbd">⌘N</kbd> new chat
          </p>
        </div>
      </div>

      <PastChatsDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        activeChatId={localChatId}
        onSelectChat={(chat: Chat | null) => {
          streamingChatIdRef.current = null;
          if (chat) {
            setLocalChatId(chat.id);
            onChatChange(chat.id);
          } else {
            handleNewChat();
          }
          setDrawerOpen(false);
        }}
      />
    </div>
  );
}
