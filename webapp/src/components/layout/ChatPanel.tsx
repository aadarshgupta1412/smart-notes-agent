"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Menu, Plus, Send, Loader2, Sparkles, X, MessageSquare, Zap, BookOpen } from "lucide-react";
import PastChatsDrawer from "@/components/chat/PastChatsDrawer";
import MentionDropdown from "@/components/chat/MentionDropdown";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import type { Chat, ChatFilters, Message } from "@/lib/types";

interface Props {
  filters: ChatFilters;
  activeChatId: string | null;
  onChatChange: (chatId: string | null) => void;
}

function TypingIndicator() {
  return (
    <div className="flex items-center gap-1 px-2">
      <div className="typing-dot size-2 rounded-full bg-muted-foreground/60" />
      <div className="typing-dot size-2 rounded-full bg-muted-foreground/60" />
      <div className="typing-dot size-2 rounded-full bg-muted-foreground/60" />
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

  const handleSend = async (messageOverride?: string) => {
    const messageToSend = messageOverride || input.trim();
    if (!messageToSend || isStreaming) return;

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
      content: messageToSend,
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
          message: messageToSend,
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
                  if (lastMsg?.role === "assistant") {
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
        if (lastMsg?.role === "assistant" && !lastMsg.content) {
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
    <div className="flex flex-col h-full relative bg-background">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-card/50 backdrop-blur-sm">
        <Tooltip>
          <TooltipTrigger>
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={handleNewChat} 
              className="size-9 hover:bg-primary/10 hover:text-primary"
            >
              <Plus className="size-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>New chat</TooltipContent>
        </Tooltip>
        
        <div className="flex items-center gap-2">
          <MessageSquare className="size-4 text-muted-foreground" />
          <h2 className="font-semibold text-foreground truncate">{chatTitle}</h2>
        </div>
        
        <Tooltip>
          <TooltipTrigger>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setDrawerOpen(true)}
              className="size-9 hover:bg-accent"
            >
              <Menu className="size-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Past chats</TooltipContent>
        </Tooltip>
      </div>

      {/* Messages area */}
      <ScrollArea className="flex-1">
        <div className="px-4 py-6 max-w-3xl mx-auto">
          <div className="flex flex-col gap-4">
            {/* Empty state */}
            {messages.length === 0 && (
              <div className="flex flex-col items-center justify-center min-h-[60vh] text-center animate-fade-in">
                {/* Gradient icon container */}
                <div className="relative mb-6">
                  <div className="size-20 rounded-2xl gradient-primary flex items-center justify-center shadow-lg glow-primary">
                    <Sparkles className="size-10 text-white" />
                  </div>
                  <div className="absolute -bottom-1 -right-1 size-8 rounded-lg bg-purple-500 flex items-center justify-center shadow-md">
                    <Zap className="size-4 text-white" />
                  </div>
                </div>
                
                <h3 className="text-xl font-semibold text-foreground mb-2">
                  Ask AI about your knowledge
                </h3>
                <p className="text-sm text-muted-foreground max-w-md mb-8">
                  Chat with your saved highlights and bookmarks. Use <kbd className="kbd">@folder</kbd> or <kbd className="kbd">@source</kbd> to scope your search.
                </p>

                {/* Suggested prompts */}
                <div className="flex flex-wrap justify-center gap-2">
                  {SUGGESTED_PROMPTS.map((prompt, i) => (
                    <button
                      key={i}
                      onClick={() => handleSend(prompt)}
                      className="prompt-pill animate-fade-in"
                      style={{ animationDelay: `${i * 0.1}s` }}
                    >
                      {prompt}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Messages */}
            {messages.map((msg, index) => (
              <div
                key={msg.id}
                className={cn(
                  "flex animate-message",
                  msg.role === "user" ? "justify-end" : "justify-start"
                )}
                style={{ animationDelay: `${index * 0.05}s` }}
              >
                {msg.role === "assistant" && (
                  <div className="size-8 rounded-lg gradient-primary flex items-center justify-center mr-3 mt-1 flex-shrink-0">
                    <Sparkles className="size-4 text-white" />
                  </div>
                )}
                
                <div
                  className={cn(
                    "max-w-[80%] px-4 py-3 text-sm leading-relaxed",
                    msg.role === "user"
                      ? "chat-message-user"
                      : "chat-message-ai"
                  )}
                >
                  {msg.content ? (
                    <div className={cn(
                      "prose prose-sm max-w-none",
                      msg.role === "user" && "prose-invert",
                      isStreaming && msg.role === "assistant" && index === messages.length - 1 && "streaming-cursor"
                    )}>
                      {msg.content}
                    </div>
                  ) : (
                    <TypingIndicator />
                  )}
                </div>

                {msg.role === "user" && (
                  <div className="size-8 rounded-lg bg-primary/10 flex items-center justify-center ml-3 mt-1 flex-shrink-0">
                    <BookOpen className="size-4 text-primary" />
                  </div>
                )}
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>
        </div>
      </ScrollArea>

      {/* Active mentions bar */}
      {activeMentions.length > 0 && (
        <div className="px-4 py-2 border-t border-border/50 bg-muted/30 flex flex-wrap gap-2 animate-fade-in">
          <span className="text-xs text-muted-foreground self-center">Searching in:</span>
          {activeMentions.map((m) => (
            <Badge
              key={`${m.type}-${m.id}`}
              variant="secondary"
              className="gap-1.5 pr-1.5 bg-primary/10 text-primary border-primary/20"
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
                className="ml-0.5 rounded-full hover:bg-primary/20 p-0.5 transition-colors"
              >
                <X className="size-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}

      {/* Input area */}
      <div className="p-4 border-t border-border bg-card/50 backdrop-blur-sm relative">
        {showMention && (
          <div className="absolute bottom-full left-4 right-4 mb-2 z-10">
            <MentionDropdown
              onSelect={handleMentionSelect}
              onClose={() => setShowMention(false)}
            />
          </div>
        )}
        
        <div className="max-w-3xl mx-auto">
          <div className="flex items-end gap-3">
            <div className="flex-1 relative">
              <textarea
                ref={inputRef}
                value={input}
                onChange={handleInputChange}
                onKeyDown={handleKeyDown}
                placeholder="Ask about your saved knowledge..."
                rows={1}
                className={cn(
                  "w-full resize-none px-4 py-3 pr-12",
                  "bg-muted/50 rounded-xl border border-border/50",
                  "focus:border-primary/50 focus:bg-background focus:shadow-md",
                  "focus:outline-none focus:ring-2 focus:ring-primary/20",
                  "text-sm max-h-32 overflow-y-auto",
                  "transition-all duration-200",
                  "placeholder:text-muted-foreground"
                )}
                style={{ minHeight: "48px" }}
              />
              <div className="absolute right-3 bottom-3 text-xs text-muted-foreground">
                <kbd className="kbd text-[10px]">@</kbd>
              </div>
            </div>
            
            <Button
              size="icon"
              onClick={() => handleSend()}
              disabled={!input.trim() || isStreaming}
              className={cn(
                "size-12 rounded-xl transition-all duration-200",
                input.trim() && !isStreaming
                  ? "gradient-primary shadow-md hover:shadow-lg hover:scale-105"
                  : "bg-muted text-muted-foreground"
              )}
            >
              {isStreaming ? (
                <Loader2 className="size-5 animate-spin" />
              ) : (
                <Send className="size-5" />
              )}
            </Button>
          </div>
          
          <p className="text-xs text-muted-foreground text-center mt-3">
            Press <kbd className="kbd">Enter</kbd> to send, <kbd className="kbd">Shift + Enter</kbd> for new line
          </p>
        </div>
      </div>

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
