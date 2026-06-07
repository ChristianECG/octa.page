# octa.page

Static technical notebook. Engineering lab notes, architecture decisions, runtime investigations, and systems research — made public.

## Stack

- **Astro 6** — static generation, minimal client JS
- **Tailwind CSS v4** via `@tailwindcss/vite`
- **MDX** via `@astrojs/mdx`
- Geist Sans + Geist Mono, self-hosted

## Commands

```sh
pnpm dev       # dev server at localhost:4321
pnpm build     # production build → ./dist/
pnpm preview   # preview built output
```

## Content

Content lives in `/content/{type}/` as Markdown or MDX files with YAML frontmatter.

| Type | Purpose |
|---|---|
| `architecture` | Architectural decisions and tradeoffs |
| `runtime` | Browser/runtime behavior research |
| `pulse` | Building Pulse series |
| `systems` | Long-form systems essays |
| `notes` | Short technical notes |

### Frontmatter

```yaml
title: "Title"
date: 2026-06-06
tags:
  - tag
project: pulse      # optional — links to /project/pulse
series: pulse       # optional — groups related posts
pinned: true        # optional
status: published   # or: draft
```

## Routes

```
/              → all entries
/doc/:slug     → article
/type/:type    → filtered by type
/project/:name → filtered by project
```

