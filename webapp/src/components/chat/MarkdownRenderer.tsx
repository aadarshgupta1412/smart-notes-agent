"use client";

import { Streamdown } from "streamdown";
import "streamdown/styles.css";
import { code } from "@streamdown/code";
import { cn } from "@/lib/utils";

interface Props {
  content: string;
  className?: string;
  isStreaming?: boolean;
}

export default function MarkdownRenderer({ content, className, isStreaming = false }: Props) {
  return (
    <div className={cn("markdown-content", className)}>
      <Streamdown
        plugins={{ code }}
        animated={{
          animation: "fadeIn",
          duration: 10,
          easing: "linear",
          sep: "word",
        }}
        caret={isStreaming ? "block" : undefined}
        isAnimating={isStreaming}
      >
        {content}
      </Streamdown>
    </div>
  );
}
