"use client";

import { useState, useCallback } from "react";
import LeftPanel from "@/components/layout/LeftPanel";
import ChatPanel from "@/components/layout/ChatPanel";
import type { ChatFilters } from "@/lib/types";

export default function DashboardPage() {
  const [chatFilters, setChatFilters] = useState<ChatFilters>({});
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const handleRefresh = useCallback(() => {
    setRefreshKey((k) => k + 1);
  }, []);

  return (
    <div className="h-screen flex overflow-hidden bg-background">
      {/* Left Panel - Fixed width with responsive sizing */}
      <div className="panel-left border-r border-border bg-sidebar flex flex-col relative">
        <LeftPanel
          key={`left-${refreshKey}`}
          onRefresh={handleRefresh}
          onFiltersChange={setChatFilters}
        />
        
        {/* Gradient divider accent */}
        <div className="absolute top-0 right-0 bottom-0 w-px">
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-primary/20 to-transparent" />
        </div>
      </div>

      {/* Right Panel - Chat area */}
      <div className="flex-1 flex flex-col min-w-0 bg-background">
        <ChatPanel
          filters={chatFilters}
          activeChatId={activeChatId}
          onChatChange={setActiveChatId}
        />
      </div>
    </div>
  );
}
