"use client";

import { useState, useEffect } from "react";
import {
  ChevronDown,
  ChevronUp,
  ExternalLink,
  FileText,
  Sparkles,
  Loader2,
} from "lucide-react";
import type { Source, Highlight, AISummary } from "@/lib/types";

interface Props {
  source: Source;
}

export default function SourceDetail({ source }: Props) {
  const [summary, setSummary] = useState<AISummary | null>(null);
  const [highlights, setHighlights] = useState<Highlight[]>([]);
  const [showSummary, setShowSummary] = useState(true);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchDetails() {
      setLoading(true);
      const res = await fetch(`/api/sources/${source.id}`);
      if (res.ok) {
        const data = await res.json();
        setSummary(data.ai_summary || null);
        setHighlights(data.highlights || []);
      }
      setLoading(false);
    }
    fetchDetails();
  }, [source.id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4">
      {/* AI Summary card */}
      <div className="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-xl border border-indigo-100 overflow-hidden">
        <button
          onClick={() => setShowSummary(!showSummary)}
          className="w-full flex items-center justify-between px-4 py-3"
        >
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-indigo-600" />
            <span className="font-medium text-indigo-900 text-sm">AI Summary</span>
          </div>
          {showSummary ? (
            <ChevronUp className="w-4 h-4 text-indigo-400" />
          ) : (
            <ChevronDown className="w-4 h-4 text-indigo-400" />
          )}
        </button>
        {showSummary && (
          <div className="px-4 pb-4">
            {summary ? (
              <p className="text-sm text-gray-700 leading-relaxed">
                {summary.summary_text}
              </p>
            ) : (
              <p className="text-sm text-gray-400 italic">
                No summary available yet. Try resyncing the source.
              </p>
            )}
          </div>
        )}
      </div>

      {/* Source link */}
      <a
        href={source.url}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center gap-2 px-4 py-2.5 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors"
      >
        <ExternalLink className="w-4 h-4 text-gray-400" />
        <span className="text-sm text-indigo-600 truncate flex-1">
          {source.url}
        </span>
      </a>

      {/* Highlights */}
      {source.type === "highlight" && highlights.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center gap-2 px-1">
            <FileText className="w-4 h-4 text-gray-400" />
            <span className="text-xs text-gray-400 uppercase tracking-wider font-medium">
              Highlights ({highlights.length})
            </span>
          </div>
          {highlights.map((hl) => (
            <div
              key={hl.id}
              className="px-4 py-3 bg-yellow-50 border-l-4 border-yellow-300 rounded-r-xl"
            >
              <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">
                {hl.content}
              </p>
              <p className="text-xs text-gray-400 mt-2">
                {new Date(hl.created_at).toLocaleDateString()}
              </p>
            </div>
          ))}
        </div>
      )}

      {/* Metadata */}
      <div className="px-1 space-y-1">
        <p className="text-xs text-gray-400">
          Type: <span className="text-gray-500">{source.type}</span>
        </p>
        <p className="text-xs text-gray-400">
          Added: <span className="text-gray-500">{new Date(source.created_at).toLocaleString()}</span>
        </p>
        {source.updated_at !== source.created_at && (
          <p className="text-xs text-gray-400">
            Updated: <span className="text-gray-500">{new Date(source.updated_at).toLocaleString()}</span>
          </p>
        )}
      </div>
    </div>
  );
}
