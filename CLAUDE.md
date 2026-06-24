# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

---

## Project

**Octa** is a static technical notebook — an engineering lab and architecture journal, not a blog. It publishes systems research, runtime investigations, architecture decisions, and performance case studies. Content should feel like internal engineering notes made public.

---

## Tech Stack

- **Framework**: Astro 6 (static generation, minimal client-side JS)
- **Styling**: Tailwind CSS v4 via `@tailwindcss/vite` (not `@astrojs/tailwind` — incompatible with Astro 6)
- **Fonts**: Geist Sans + Geist Mono (woff2 variable fonts in `/public/fonts/`, self-hosted via `@font-face` in `global.css`)
- **Content**: Markdown / MDX with YAML frontmatter, Content Layer API (`src/content.config.ts`)
- **Integrations**: `@astrojs/mdx`, `@astrojs/sitemap`
- **Package manager**: pnpm

---

## Commands

```bash
pnpm dev        # start dev server
pnpm build      # production build (static export)
pnpm preview    # preview built output
pnpm astro      # direct astro CLI access
```

---

## URL Structure

```
/              → homepage (all entries, table layout)
/doc/:slug     → individual article (slug = markdown filename without extension)
/type/:type    → articles filtered by type (architecture, runtime, systems, notes, timezone)
/project/:name → articles filtered by project
```

**Important:** slugs must be unique across all content directories since all articles share the `/doc/` prefix.

---

## Content Types (collections)

Content lives in `/content/{type}/` at the repo root. The five Astro collections map to these directories:

| Type | Purpose |
|------|---------|
| `architecture` | Architectural decisions and tradeoffs |
| `runtime` | Browser/runtime behavior research |
| `systems` | Long-form systems essays |
| `notes` | Short technical notes |
| `timezone` | Timezone / IANA / i18n investigations |

The active type set is defined in `src/lib/types.ts` (`ALL_TYPES`) and `src/content.config.ts`. New content goes into one of these five types.

---

## Content Frontmatter Schema

```yaml
title: "React Scheduler Starvation Under Heavy Load"
date: 2026-05-19
tags:
  - react
  - scheduler
description: "One-line summary — used for meta description, OG/Twitter cards, JSON-LD, and RSS"
project: pulse       # optional — links to /project/pulse in sidebar + breadcrumb
series: pulse        # optional — groups related posts
pinned: true         # optional — appears in sidebar "Pinned" count
status: published    # or: draft (excluded from build and sidebar counts)
```

---

## Code Architecture

**Content Layer** (`src/content.config.ts`): All five types share a single `articleSchema` via a `makeCollection()` helper pointing to `./content/{type}/`.

**`getStaticPaths` constraint**: In Astro 6, `getStaticPaths` runs in an isolated scope. Do NOT reference module-level `const` arrays inside it — define the types array inline inside the function each time.

**Routing** (`src/pages/`):
- `index.astro` — homepage, queries all collections, renders entries table
- `doc/[slug].astro` — article page, iterates all types to find the entry
- `type/[type].astro` — type listing page
- `project/[project].astro` — project listing page (paths derived from `project` frontmatter values)

**Layouts** (`src/layouts/`):
- `BaseLayout.astro` — HTML shell, imports `global.css`, renders `<Sidebar>`, mobile bar, and footer with social links (christianecg.com, GitHub, LinkedIn)
- `ArticleLayout.astro` — wraps BaseLayout, article header with breadcrumb (octa / type / project), title, and metadata row. Emits per-article `TechArticle` JSON-LD into BaseLayout's `head` slot, and renders chronological prev/next pager at the foot of the prose (prev = newer entry, next = older). `description` flows through to meta/OG tags — always set it in frontmatter.

**Sidebar** (`src/components/Sidebar.astro`): Single-scroll nav with three groups — Index (all notes, this month, pinned, drafts), Types, and Projects. Projects group only appears if any published entry has a `project` field. Status block at bottom shows build status and entry count. No tabs.

**Styling** (`src/styles/global.css`): Tailwind v4 with `@theme` block for design tokens. Key tokens:
- `--color-bg: #0e1116`, `--color-panel: #12161c`
- `--color-ink: #dde0e6`, `--color-ink-2: #a0a6ae`, `--color-mute: #5e6670`
- `--color-rule: rgba(255,255,255,0.06)`, `--color-rule-2: rgba(255,255,255,0.12)`
- `--color-accent: oklch(74% 0.07 240)` — used only for active nav, type labels in tables, project breadcrumb. Never decorative.

**App shell**: CSS grid `220px sidebar + 1fr main` with a 1px hairline rule on the column gutter via `linear-gradient` on the grid background.

---

## Design Constraints

- **Dark only** — no light mode
- **No rounded corners** (`border-radius: 0` default), no gradients, no drop shadows on cards
- **No bold sans in prose** — use `--color-ink` vs `--color-ink-2` for emphasis instead
- **Accent is structural** — only for active nav state, type labels in tables, project badges, build status dot. Never decorative
- **No animations** on page transitions; hovers are color-only transitions (120ms)
- Typography: body 13px/1.55 sans, prose 14px/1.7, max 64ch. Headings ≤ 30px / 500 weight / -0.015em
- Monospace for: all metadata, numbers, uppercase labels, breadcrumbs, table cells (except title)

---

## Integration Context

Octa is the public R&D layer for **Pulse** (a frontend observability platform). Articles with `project: pulse` document Pulse's design and implementation. (There is no longer a dedicated `pulse` content type — use `project: pulse` instead.)
