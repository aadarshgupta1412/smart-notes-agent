# Resume Writing Guide

Content strategy for kami resume templates (CN and EN). Covers bullet structure, emphasis density, timeline narrative, and open source entries. For general writing quality bars, see `references/writing.md`.

---

## Three-part bullet: Role / Actions / Impact

Each project row uses a fixed three-part structure. The word and character targets below are maximums, not targets; shorter is better when the meaning is complete.

**Chinese (CN)**

| Row | Label | Target | Hard limit |
|---|---|---|---|
| 1 | 角色 | 50 characters | 60 characters |
| 2 | 动作 | 70 characters | 80 characters |
| 3 | 结果 | 90 characters | 100 characters |

**English (EN)**

| Row | Label | Target | Hard limit |
|---|---|---|---|
| 1 | Role | 35 words | 40 words |
| 2 | Actions | 45 words | 55 words |
| 3 | Impact | 55 words | 65 words |

**What goes in each row**

- Role: what the project was, why it existed, and your position in it. No verbs yet.
- Actions: the decisions and techniques you applied. One concrete approach per sentence.
- Impact: quantified outcomes only. If no number exists, write the magnitude or scope (team size, user count, traffic tier).

**Self-check**: read Impact aloud. If it sounds like a process description ("improved the pipeline") rather than a result ("reduced p95 latency from 800ms to 120ms"), rewrite.

---

## Key-number highlight density

`.hl` applies brand-blue color to mark the single most important figure or phrase in a line. It is not a general emphasis tool.

**Use:**
- One `.hl` per project row, maximum two across all three rows of one project
- Numbers with units: `<span class="hl">120ms</span>`, `<span class="hl">38%</span>`
- A distinctive noun when no number exists: `<span class="hl">production-first rollout</span>`

**Avoid:**
- Highlighting adjectives or qualifiers: "significantly", "dramatically", "key"
- Two `.hl` spans on the same row
- Highlighting an entire clause

Healthy ratio: one emphasis per 80 to 150 characters of body text.

---

## Timeline: three-step evolution arc

The `.timeline` section shows career judgment, not a job chronology. Three steps, each one sentence.

**Structuring the arc**

Each step should answer: what shifted in how you thought or operated, and why does it matter for the reader?

Use | Avoid
---|---
"Shifted from feature delivery to owning the model quality loop end-to-end" | "Joined the AI team as senior engineer"
"Moved budget approval to the team level, cutting decision lag from weeks to hours" | "Led a team of 8 engineers"
"Started shipping open-source tools to validate ideas before internal roadmap commits" | "Side projects and open source work"

**Three-step pattern**

1. Foundation: the constraint or context that shaped your thinking in the early phase
2. Inflection: the moment or decision that changed what you were optimizing for
3. Present: the operating mode you've settled into and what it produces

Do not list events. List shifts in judgment and scope.

---

## Open source entries

Each `.os-item` has three parts: name, one-line description, and star count. No README summaries, no feature lists.

**Description formula**: `[language or stack] · [what it does] · [platform or audience]`

Use | Avoid
---|---
"Rust + Tauri · turns any URL into a lightweight desktop app · macOS / Windows / Linux" | "A lightweight desktop app builder based on Tauri that supports packaging web apps as native applications across multiple platforms"
"Swift · native Markdown notes · macOS AppKit" | "A beautiful and fast Markdown note-taking app for macOS with syntax highlighting and live preview"

**Star count**: use the `.big` class on the top two entries (your flagship projects). Plain `.os-star` for the rest.

**`.os-highlight`**: one short paragraph, one anecdote. Focus on a specific external validation moment: a notable person who shared it, a community that formed around it, a moment when it reached an audience you didn't target. Not a feature summary.

---

## Page 2 rhythm

Page 2 has more space than page 1. Do not compress it to match page 1 density.

- OS intro: one sentence positioning + one sentence with the aggregate GitHub numbers. No more.
- Convictions: each card is one judgment call + one piece of downstream evidence. Not a project summary.
- Skills: each row names one capability area and demonstrates it with one concrete example. No abstract claims.
- Education: one line. If there is a judgment-flavored note (declined grad school, switched majors), include it. That note signals self-direction better than GPA.
