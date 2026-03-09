export interface Profile {
  id: string;
  email: string;
  name: string;
  avatar_url: string;
  created_at: string;
  updated_at: string;
}

export interface Folder {
  id: string;
  user_id: string;
  name: string;
  created_at: string;
  updated_at: string;
  source_count?: number;
}

export interface Source {
  id: string;
  user_id: string;
  folder_id: string;
  url: string;
  title: string | null;
  type: "highlight" | "bookmark";
  page_metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface Highlight {
  id: string;
  user_id: string;
  source_id: string;
  content: string;
  created_at: string;
  updated_at: string;
}

export interface AISummary {
  id: string;
  user_id: string;
  source_id: string;
  summary_text: string;
  created_at: string;
  updated_at: string;
}

export interface Chat {
  id: string;
  user_id: string;
  title: string;
  created_at: string;
  updated_at: string;
}

export interface Message {
  id: string;
  chat_id: string;
  user_id: string;
  role: "user" | "assistant" | "system";
  content: string;
  created_at: string;
}

export interface Embedding {
  id: string;
  user_id: string;
  source_id: string;
  highlight_id: string | null;
  content: string;
  similarity?: number;
}

export interface SourceWithDetails extends Source {
  highlights?: Highlight[];
  ai_summary?: AISummary | null;
}

export interface FolderWithSources extends Folder {
  sources?: Source[];
}

export interface ChatFilters {
  folderIds?: string[];
  sourceIds?: string[];
}

export interface ExtensionPayload {
  folderId?: string;
  newFolderName?: string;
  source: {
    url: string;
    title: string;
    type: "highlight" | "bookmark";
  };
  content?: string;
  pageMetadata?: Record<string, unknown>;
}
