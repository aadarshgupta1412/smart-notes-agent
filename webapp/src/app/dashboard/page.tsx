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
    <div className="h-screen flex overflow-hidden bg-gray-50">
      <div className="w-[420px] min-w-[360px] border-r border-gray-200 bg-white flex flex-col">
        <LeftPanel
          key={`left-${refreshKey}`}
          onRefresh={handleRefresh}
          onFiltersChange={setChatFilters}
        />
      </div>

      <div className="flex-1 flex flex-col min-w-0">
        <ChatPanel
          filters={chatFilters}
          activeChatId={activeChatId}
          onChatChange={setActiveChatId}
        />
      </div>
    </div>
  );
}
