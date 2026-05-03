# Knowledge Hub — Design System

## Philosophy

Warm, quiet, readable. Inspired by the paper-like warmth of Tab Out.
No cold whites. No gradients. No glow. Content breathes in a calm, warm space.

## Color Palette

### Surfaces — Warm Paper Tones

| Token | Light | Dark | Use |
|-------|-------|------|-----|
| `--background` | `#F5F0E8` | `#141210` | Page background |
| `--card` | `#FDF8F0` | `#1C1A17` | Cards, panels, sidebar |
| `--secondary` | `#EDE7DD` | `#242220` | Hover states, muted areas |
| `--muted` | `#EDE7DD` | `#242220` | Inputs, raised backgrounds |
| `--border` | `#E2DACF` | `#302C27` | Borders, dividers |

### Text — WCAG AA Compliant

| Token | Light | Dark | Use |
|-------|-------|------|-----|
| `--foreground` | `#1A1613` | `#F5F0EB` | Primary text |
| `--text-secondary` | `#6B6259` | `#A39889` | Labels, secondary |
| `--muted-foreground` | `#948980` | `#7A7168` | Placeholders only |

### Primary — Warm Indigo-Slate

| Token | Light | Dark | Use |
|-------|-------|------|-----|
| `--primary` | `#4A4168` | `#B0A8D0` | Buttons, links, active states |
| `--primary-hover` | `#3A3358` | `#C4BDE0` | Hover on primary elements |
| `--primary-foreground` | `#F5F0E8` | `#1A1613` | Text on primary bg |
| `--primary-subtle` | `#EBE7F2` | `#1E1C25` | Selected items bg |
| `--accent` | `#EBE7F2` | `#1E1C25` | Accent backgrounds |
| `--accent-foreground` | `#4A4168` | `#B0A8D0` | Accent text |
| `--ring` | `#4A4168` | `#B0A8D0` | Focus rings |

### Chat Bubbles

| Token | Light | Dark | Use |
|-------|-------|------|-----|
| `--chat-user` | `#E8E2D8` | `#2C2824` | User message background |
| `--chat-user-foreground` | `#1A1613` | `#D5CFC8` | User message text |

AI assistant messages have **no bubble** — content flows directly on the page background with `text-foreground`.

### Semantic

| Token | Light | Dark | Use |
|-------|-------|------|-----|
| `--destructive` | `#B35A5A` | `#E08A8A` | Errors, delete |
| `--highlight` | `#C8713A` | `#E0924A` | Saved highlights (amber) |
| `--highlight-subtle` | `#FBF2E8` | `#1C1508` | Highlight backgrounds |
| `--success` | `#5A7A62` | `#88B892` | Confirmations |

### Sidebar

| Token | Light | Dark | Use |
|-------|-------|------|-----|
| `--sidebar` | `#FDF8F0` | `#1C1A17` | Sidebar background |
| `--sidebar-foreground` | `#1A1613` | `#F5F0EB` | Sidebar text |
| `--sidebar-primary` | `#4A4168` | `#B0A8D0` | Sidebar active items |
| `--sidebar-border` | `#E2DACF` | `#302C27` | Sidebar borders |

## Typography

- **Body**: DM Sans (300, 400, 500, 600) via `next/font/google`, CSS var `--font-dm-sans`
- **Monospace**: JetBrains Mono (400, 500) via `next/font/google`, CSS var `--font-mono`
- **Sizes**: 13px body, 11px captions, 14px emphasis, 20px page titles
- **Line height**: 1.5 body, 1.3 headings
- **Tracking**: `-0.3px` headings, normal body
- **Font features**: `cv02`, `cv03`, `cv04`, `cv11`

## Layout

### Dashboard Structure

Two-panel layout with drag-to-reorder and resize:

```
┌──────────────────────────────────────────────────────────┐
│ [Folders Panel]  │  [Handle]  │  [Chat Panel]            │
│                  │     ║      │                           │
│ - Search         │     ║      │ - [+] Title [History]    │
│ - Folder List    │     ║      │ - Messages / Empty State │
│ - Theme Toggle   │     ║      │ - Mention Badges         │
│                  │     ║      │ - Input + Send           │
└──────────────────────────────────────────────────────────┘
```

- **Panel Order**: Drag handle (grip icon) at top-center of each panel — reorder via `@dnd-kit/react`
- **Panel Width**: Draggable resize handle between panels (pointer capture)
- **Persistence**: Order and width saved to `localStorage`
- **Constraints**: Folders min 280px, Chat min 400px, Folders max 50% viewport

### URL Routing

Chat selection uses query params via `useSearchParams` (wrapped in `Suspense`):
- Empty state: `/dashboard`
- Active chat: `/dashboard?chat=<uuid>`
- URL updates via `router.replace` with `{ scroll: false }`

### First-Message Flow

When the user sends the first message from an empty dashboard:
1. Chat created via API → `localChatId` set internally
2. User message + empty assistant message rendered immediately
3. `TypingIndicator` shows (OrbitRing + shimmer text)
4. URL updated in background — `streamingChatIdRef` prevents the load-effect from clobbering in-flight state
5. Tokens stream in → assistant message fills → streaming ends → ref unlocked

## Component Registries

Configured in `components.json`:

| Registry | URL | Purpose |
|----------|-----|---------|
| `@magicui` | `magicui.design/r/{name}` | Animated UI primitives |
| `@loading-ui` | `loading-ui.com/r/{name}.json` | Loading spinners/indicators |

Base component library: **shadcn/ui** (`base-nova` style, lucide icons).

## Components

### Buttons

- Primary: `bg-primary text-primary-foreground`
- Ghost: transparent, `hover:bg-secondary`
- Icon buttons: `size-7`/`size-8` with `size-3.5`/`size-4` icons

### Tooltips

Using `@base-ui/react/tooltip` with `asChild` support for clean DOM nesting.

### Chat Messages

```tsx
// User — right-aligned bubble
<div className="bg-chat-user text-chat-user-foreground rounded-2xl rounded-br-md">
  {content}
</div>

// Assistant — no bubble, flows on background
<div className="text-foreground">
  <MarkdownRenderer content={content} isStreaming={isCurrentlyStreaming} />
</div>
```

### TypingIndicator (Loading State)

Shown while waiting for LLM tokens:

```tsx
<OrbitRing className="size-5 text-primary" style={{ "--duration": "0.8s" }} />
<span className="shimmer-text">firing neurons...</span>
```

- **OrbitRing**: from `loading-ui` registry — static faded ring + orbiting arc (CSS keyframe `loading-ui-orbit-ring-rotation`)
- **Shimmer text**: CSS gradient sweep across text using `background-clip: text` and `-webkit-text-fill-color: transparent`, cycling `--muted-foreground` → `--foreground` over 1.5s

### Markdown Rendering

Using **Streamdown** v2 (`streamdown` + `@streamdown/code`) for streaming AI output:

```tsx
<Streamdown
  plugins={{ code }}
  animated={{ animation: "blurIn", duration: 200, easing: "ease-out", sep: "word" }}
  caret={isStreaming ? "block" : undefined}
  isAnimating={isStreaming}
>
  {content}
</Streamdown>
```

| Feature | Detail |
|---------|--------|
| Animation | `blurIn` — blur-to-sharp per word, masks chunky token delivery |
| Duration | 200ms with `ease-out` |
| Caret | Block cursor (`▋`) during streaming, auto-removed after |
| Code | Syntax highlighting via Shiki (`@streamdown/code` plugin) |
| Styles | `import "streamdown/styles.css"` for animation keyframes |
| Incomplete MD | Handles unterminated bold/italic/code during streaming |

Streamdown element styling in `globals.css` via `[data-streamdown="..."]` selectors — headings, lists, code blocks, tables, blockquotes, links all follow the design tokens.

### Chat History Drawer

Slides in from right, scoped to chat panel (absolute positioning):
- Width: `w-72`
- Background: `bg-card border-l`
- Items: `role="button"` with keyboard support (no nested buttons)

### Scroll

Using `ScrollArea` from shadcn (`@radix-ui/react-scroll-area`) with thin scrollbar styling:
- `scrollbar-width: thin`
- Thumb color: `--border`

## Spacing

Tailwind defaults:
- Panel padding: `p-4`
- List items: `px-3 py-2.5`
- Section gaps: `gap-4` to `gap-6`
- Message bubbles: `px-3.5 py-2.5`
- Item gaps: `gap-0.5`

## Borders & Radius

- Cards: `rounded-lg` (8px)
- Buttons: `rounded-md` (6px)
- Chat bubbles: `rounded-2xl` with `rounded-br-md` (user) or `rounded-bl-md` (assistant) for tail
- Badges: `rounded-full`
- Inputs: `rounded-lg`
- Code blocks: `rounded-lg`
- Border: 1px, `--border` color

## Shadows

Minimal, warm-tinted:
- Default: none (borders only)
- Dropdowns: `0 4px 20px rgba(26, 22, 19, 0.06)`
- Modals: `0 8px 32px rgba(26, 22, 19, 0.1)`

## Dark Mode

- Toggle: bottom-left of sidebar, sun/moon icon
- Two states only (no "system")
- Inline `<script>` in `<head>` prevents flash by reading `localStorage` before paint
- Dark uses warm tones (`#141210` bg, `#1C1A17` cards) — not cold blue-black

## Animations

### Allowed

| Animation | Implementation |
|-----------|---------------|
| Streaming text reveal | Streamdown `blurIn` (200ms, ease-out, per-word) |
| Streaming caret | Streamdown block caret (`▋`), blinks during `isAnimating` |
| Loading spinner | OrbitRing (0.8s orbit, CSS keyframe) |
| Shimmer text | CSS gradient sweep on `background-clip: text` (1.5s) |
| Theme toggle | 200ms transition on bg/color |
| Drawer slide | CSS transform transition |
| Fade-in | 150ms opacity for new elements |

### Not Allowed

- Slide-up/translateY on page load
- Scale transforms on hover
- Decorative/ambient animations
- Parallax effects

## Accessibility

- Focus: visible `ring-2 ring-ring` with offset
- Tooltips: proper ARIA attributes
- Chat items: `role="button"` + `tabIndex={0}` (avoids nested `<button>`)
- Loading: `role="status"` + `sr-only` text on OrbitRing
- Contrast: WCAG AA (4.5:1 for text)

## Syntax Highlighting

Code blocks use highlight.js classes in `globals.css` with design-token colors:
- Keywords: `--primary` / `--primary` (dark)
- Strings: `--highlight` tones
- Comments: `--muted-foreground`
- Numbers: `--success` tones

## What NOT to Do

- No cold whites (`#FFFFFF`, `#FAFAFA`) — use warm equivalents
- No vibrant saturated primaries — keep tones muted
- No gradients, glow, blur decorations
- No animated decorative elements
- No hover transforms (translateY, scale)
- No excessive radius (`rounded-2xl` on cards)
- No nested `<button>` elements (hydration errors)
