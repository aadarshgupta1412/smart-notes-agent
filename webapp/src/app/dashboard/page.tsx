"use client";

import {
  useState,
  useCallback,
  useEffect,
  useRef,
  ReactNode,
  Suspense,
} from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { DragDropProvider } from "@dnd-kit/react";
import { useSortable } from "@dnd-kit/react/sortable";
import { move } from "@dnd-kit/helpers";
import { GripVertical, Loader2 } from "lucide-react";
import LeftPanel from "@/components/layout/LeftPanel";
import ChatPanel from "@/components/layout/ChatPanel";
import type { ChatFilters } from "@/lib/types";

const PANEL_ORDER_KEY = "dashboard-panel-order";
const PANEL_SIZE_KEY = "dashboard-panel-size";
const DEFAULT_FOLDER_WIDTH = 380;
const MIN_FOLDER_WIDTH = 280;
const MAX_FOLDER_WIDTH_RATIO = 0.5;
const MIN_CHAT_WIDTH = 400;

function SortablePanel({
  id,
  index,
  style,
  children,
}: {
  id: string;
  index: number;
  style?: React.CSSProperties;
  children: ReactNode;
}) {
  const { ref, handleRef, isDragSource } = useSortable({ id, index });

  return (
    <div
      ref={ref}
      className="relative h-full min-w-0"
      style={{
        ...style,
        opacity: isDragSource ? 0.5 : 1,
        transition: isDragSource ? "opacity 0.15s" : undefined,
      }}
    >
      <button
        ref={handleRef}
        title="Drag to reorder"
        className="absolute top-2 left-1/2 -translate-x-1/2 z-20
          flex items-center gap-0.5 px-1.5 py-0.5 rounded-md
          bg-card/90 border border-border/50 backdrop-blur-sm
          text-muted-foreground hover:text-foreground hover:border-border
          opacity-0 hover:opacity-100 focus-visible:opacity-100
          transition-all duration-150 cursor-grab active:cursor-grabbing"
      >
        <GripVertical className="size-3" />
        <span className="text-[10px] font-medium select-none">Drag</span>
      </button>
      {children}
    </div>
  );
}

function ResizeHandle({ onResize }: { onResize: (deltaX: number) => void }) {
  const isDragging = useRef(false);
  const lastX = useRef(0);

  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      e.preventDefault();
      isDragging.current = true;
      lastX.current = e.clientX;
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
    },
    []
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!isDragging.current) return;
      const dx = e.clientX - lastX.current;
      lastX.current = e.clientX;
      onResize(dx);
    },
    [onResize]
  );

  const handlePointerUp = useCallback(() => {
    isDragging.current = false;
  }, []);

  return (
    <div
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      className="w-1.5 shrink-0 bg-transparent hover:bg-border active:bg-primary/20
        transition-colors cursor-col-resize flex items-center justify-center group/handle"
    >
      <div className="w-0.5 h-8 rounded-full bg-border group-hover/handle:bg-muted-foreground group-active/handle:bg-primary transition-colors" />
    </div>
  );
}

function DashboardContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const chatIdFromUrl = searchParams.get("chat");
  
  const [chatFilters, setChatFilters] = useState<ChatFilters>({});
  const [refreshKey, setRefreshKey] = useState(0);
  const [panelOrder, setPanelOrder] = useState<string[]>(["folders", "chat"]);
  const [folderWidth, setFolderWidth] = useState(DEFAULT_FOLDER_WIDTH);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    try {
      const savedOrder = localStorage.getItem(PANEL_ORDER_KEY);
      if (savedOrder) {
        const parsed = JSON.parse(savedOrder);
        if (Array.isArray(parsed) && parsed.length === 2) setPanelOrder(parsed);
      }
      const savedSize = localStorage.getItem(PANEL_SIZE_KEY);
      if (savedSize) {
        const w = parseInt(savedSize, 10);
        if (w >= MIN_FOLDER_WIDTH) setFolderWidth(w);
      }
    } catch {}
  }, []);

  const handleChatChange = useCallback((chatId: string | null) => {
    if (chatId) {
      // Use replace for immediate URL update without full navigation
      router.replace(`/dashboard?chat=${chatId}`, { scroll: false });
    } else {
      router.replace("/dashboard", { scroll: false });
    }
  }, [router]);

  const handleRefresh = useCallback(() => {
    setRefreshKey((k) => k + 1);
  }, []);

  const handleResize = useCallback(
    (deltaX: number) => {
      setFolderWidth((prev) => {
        const containerWidth = containerRef.current?.offsetWidth ?? 1200;
        const maxWidth = Math.floor(
          containerWidth * MAX_FOLDER_WIDTH_RATIO
        );
        const minChatRequirement = containerWidth - MIN_CHAT_WIDTH - 6;
        const effectiveMax = Math.min(maxWidth, minChatRequirement);

        const folderIsFirst = panelOrder[0] === "folders";
        const next = folderIsFirst ? prev + deltaX : prev - deltaX;
        const clamped = Math.max(MIN_FOLDER_WIDTH, Math.min(next, effectiveMax));

        localStorage.setItem(PANEL_SIZE_KEY, String(clamped));
        return clamped;
      });
    },
    [panelOrder]
  );

  const foldersContent = (
    <div
      className={`h-full bg-card flex flex-col ${
        panelOrder[0] === "folders"
          ? "border-r border-border"
          : "border-l border-border"
      }`}
    >
      <LeftPanel
        key={`left-${refreshKey}`}
        onRefresh={handleRefresh}
        onFiltersChange={setChatFilters}
      />
    </div>
  );

  const chatContent = (
    <div className="h-full flex flex-col min-w-0">
      <ChatPanel
        filters={chatFilters}
        activeChatId={chatIdFromUrl}
        onChatChange={handleChatChange}
      />
    </div>
  );

  const panelMap: Record<string, ReactNode> = {
    folders: foldersContent,
    chat: chatContent,
  };

  const firstId = panelOrder[0];
  const secondId = panelOrder[1];
  const firstIsFolders = firstId === "folders";

  return (
    <div className="h-screen bg-background" ref={containerRef}>
      <DragDropProvider
        onDragEnd={(event) => {
          setPanelOrder((prev) => {
            const next = move(prev, event);
            localStorage.setItem(PANEL_ORDER_KEY, JSON.stringify(next));
            return next;
          });
        }}
      >
        <div className="flex h-full">
          <SortablePanel
            id={firstId}
            index={0}
            style={{
              width: firstIsFolders ? folderWidth : undefined,
              flex: firstIsFolders ? `0 0 ${folderWidth}px` : "1 1 0%",
              minWidth: firstIsFolders ? MIN_FOLDER_WIDTH : MIN_CHAT_WIDTH,
            }}
          >
            {panelMap[firstId]}
          </SortablePanel>

          <ResizeHandle onResize={handleResize} />

          <SortablePanel
            id={secondId}
            index={1}
            style={{
              width: !firstIsFolders ? folderWidth : undefined,
              flex: !firstIsFolders ? `0 0 ${folderWidth}px` : "1 1 0%",
              minWidth: !firstIsFolders ? MIN_FOLDER_WIDTH : MIN_CHAT_WIDTH,
            }}
          >
            {panelMap[secondId]}
          </SortablePanel>
        </div>
      </DragDropProvider>
    </div>
  );
}

function DashboardFallback() {
  return (
    <div className="h-screen bg-background flex items-center justify-center">
      <Loader2 className="size-6 animate-spin text-muted-foreground" />
    </div>
  );
}

export default function DashboardPage() {
  return (
    <Suspense fallback={<DashboardFallback />}>
      <DashboardContent />
    </Suspense>
  );
}
