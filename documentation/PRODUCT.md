# Knowledge Hub - Product Context

## What is Knowledge Hub?

Knowledge Hub is a personal knowledge management system that lets users **capture web content instantly** and **retrieve it through natural conversation**. It consists of a Chrome extension for capturing and a web application for organizing and querying saved content.

---

## The Problem

### Information Overload
People encounter valuable content daily—articles, research papers, tutorials, quotes, references—but have no effective way to:
1. **Save it quickly** without breaking their flow
2. **Organize it meaningfully** without manual effort
3. **Find it later** when they actually need it

### Current Solutions Fall Short
- **Browser bookmarks**: Become graveyards—saved but never revisited, no search beyond titles
- **Note-taking apps**: Require manual copy-paste, context is lost
- **Read-later apps**: Focus on articles, not specific highlights or quotes
- **Search history**: Cluttered, no way to filter "things I found valuable"

### The Core Frustration
> "I know I read something about this somewhere... but where?"

---

## The Solution

### Instant Capture (Chrome Extension)
- **One-click save** from any webpage
- **Highlight mode**: Select text → save with context
- **Bookmark mode**: Save entire page reference
- **Smart folders**: Auto-suggest folder based on content, or create new
- **Zero friction**: No app switching, no copy-paste

### Intelligent Organization (Web App)
- **Folders**: User-defined categories (Research, Work, Learning, etc.)
- **Sources**: Each saved item with URL, title, favicon, metadata
- **Highlights**: Extracted text snippets from sources
- **AI Summaries**: Auto-generated 2-3 sentence summaries per source

### Conversational Retrieval (AI Chat)
- **Natural language queries**: "What did I save about machine learning?"
- **Scoped search**: Use @folder or @source to narrow context
- **Source citations**: AI responses reference specific saved content
- **Chat history**: Resume previous conversations

---

## User Journey

### Capture Flow
```
User browses web
       ↓
Finds valuable content
       ↓
Selects text (optional)
       ↓
Clicks extension icon
       ↓
Selects/creates folder
       ↓
Clicks "Save"
       ↓
Done (< 5 seconds)
```

### Retrieval Flow
```
User has a question
       ↓
Opens Knowledge Hub
       ↓
Types natural language query
       ↓
AI searches saved content (vector similarity)
       ↓
AI responds with answer + source citations
       ↓
User clicks source to see original
```

---

## Core Features

### 1. Chrome Extension
| Feature | Description |
|---------|-------------|
| Google Sign-In | One-click authentication |
| Text Selection | Capture highlighted text from any page |
| Page Metadata | Auto-extract title, URL, favicon, domain |
| Folder Selection | Dropdown with existing folders |
| Folder Creation | Create new folder inline |
| Smart Suggestion | Suggest folder based on page keywords |
| Dual Save Modes | Highlight (with text) or Bookmark (page only) |

### 2. Web Application - Dashboard
| Feature | Description |
|---------|-------------|
| Folder List | All folders with source counts |
| Source List | Sources within selected folder |
| Source Detail | Full view with highlights, AI summary, metadata |
| Refresh/Resync | Regenerate embeddings and summaries |
| Search | Filter folders by name |

### 3. Web Application - AI Chat
| Feature | Description |
|---------|-------------|
| Natural Language | Ask questions in plain English |
| @Mentions | Scope search to specific folders or sources |
| Streaming Responses | Real-time token-by-token display |
| Source Citations | AI references specific saved content |
| Chat History | Access and resume past conversations |
| Suggested Prompts | Quick-start queries for new users |

### 4. AI Features
| Feature | Description |
|---------|-------------|
| Embeddings | Vector representations for semantic search |
| Summaries | Auto-generated 2-3 sentence source summaries |
| RAG Chat | Retrieval-augmented generation for accurate answers |
| Context Window | Last 20 messages + retrieved content |

---

## UI Layout (From Wireframes)

### Desktop View - Three Panel Layout
```
┌─────────────────────────────────────────────────────────────────────────┐
│  [Refresh] ─────────────────────────────────────────────── [Dropdown]   │
├───────────────┬───────────────────────┬─────────────────────────────────┤
│               │                       │                                 │
│   FOLDERS     │   SOURCE DETAIL       │           CHAT                  │
│               │                       │                                 │
│ ┌───────────┐ │  ┌─────────────────┐  │                                 │
│ │ Folder 1  │ │  │  AI Summary [↓] │  │                                 │
│ │ (clickable│ │  └─────────────────┘  │                                 │
│ │  link)    │ │                       │                                 │
│ └───────────┘ │  Source link ↗        │                                 │
│               │                       │                                 │
│ ┌───────────┐ │  CONTENT              │                                 │
│ │ Folder 2  │ │  (if highlighted:     │                                 │
│ └───────────┘ │   show locally,       │                                 │
│               │   else if bookmark:   │                                 │
│ ┌───────────┐ │   no content)         │                                 │
│ │ Folder 3  │ │                       │                                 │
│ └───────────┘ │  ─────────────────    │                                 │
│               │  Date ↗ Clickable     │                                 │
│               │  ─────────────────    │                                 │
│               │  Date ↗               │                                 │
│               │  ─────────────────    │                                 │
│               │  Date ↗               │                                 │
│               │  ─────────────────    │                                 │
│               │  Date ↗               │                                 │
│               │                       │                                 │
├───────────────┴───────────────────────┼─────────────────────────────────┤
│                                       │  Ask AI  │ @FOLDER/SOURCE list  │
│                                       │          │    (as dropdown)     │
└───────────────────────────────────────┴─────────────────────────────────┘
```

### Mobile View - Single Panel with Navigation
```
┌─────────────────────────────┐      ┌─────────────────────────────┐
│      Hamburger (...)        │      │  Current chat title    (...) │
│                             │      │                             │
│                             │      │  User                       │
│                             │      │  Assistant                  │
│                             │      │  ...                        │
│                             │  →   │                             │
│                             │      │                             │
│                             │      │                             │
│                             │      │                             │
│                             │      │                             │
├─────────────────────────────┤      ├─────────────────────────────┤
│         Ask AI?             │      │         Ask AI?             │
└─────────────────────────────┘      └─────────────────────────────┘
```

---

## Key Product Principles

### 1. Zero Friction Capture
- Save in under 5 seconds
- No context switching
- Works on any webpage

### 2. Automatic Intelligence
- Embeddings generated on save (async)
- Summaries generated on save (async)
- No manual tagging required

### 3. Conversational Retrieval
- Ask questions, don't search keywords
- AI understands intent, not just matches
- Always cites sources for verification

### 4. Privacy First
- All data scoped to user (row-level security)
- No sharing of personal knowledge base
- User owns their data

---

## Future Enhancements (Roadmap Ideas)

### Near-term
- [ ] Full-text search alongside vector search
- [ ] Bulk import from browser bookmarks
- [ ] Keyboard shortcuts in extension
- [ ] Tags/labels in addition to folders
- [ ] Export functionality (JSON, Markdown)

### Medium-term
- [ ] Mobile app (React Native)
- [ ] Browser extensions for Firefox, Safari
- [ ] Shared folders/collaboration
- [ ] Public knowledge bases
- [ ] API access for integrations

### Long-term
- [ ] Desktop app with local-first storage
- [ ] Offline mode with sync
- [ ] Custom AI models/fine-tuning
- [ ] Knowledge graph visualization
- [ ] Automatic categorization (no folders needed)

---

## Success Metrics

| Metric | Target | Why It Matters |
|--------|--------|----------------|
| Time to save | < 5 seconds | Friction kills adoption |
| Retrieval accuracy | > 80% relevant | Trust in AI responses |
| Daily active usage | Return within 7 days | Habit formation |
| Content retrieved | > 50% of saved items queried | Not a bookmark graveyard |

---

## Target Users

### Primary: Knowledge Workers
- Researchers gathering sources
- Students collecting study materials
- Writers organizing references
- Developers saving documentation

### Secondary: Casual Savers
- Anyone who bookmarks "to read later"
- People who screenshot quotes
- Users frustrated with browser bookmarks

---

## Competitive Landscape

| Product | Strength | Weakness vs Knowledge Hub |
|---------|----------|---------------------------|
| Pocket | Read-later, clean UI | No AI, no highlights, no chat |
| Notion Web Clipper | Full pages, rich editing | Heavy, requires Notion, no AI retrieval |
| Raindrop.io | Beautiful bookmarks | No AI, no highlights, keyword search only |
| Readwise | Highlight sync, spaced repetition | Expensive, no chat interface |
| Mem.ai | AI-native notes | No browser capture, expensive |

**Knowledge Hub's Edge**: Instant capture + AI chat retrieval in one seamless flow.
