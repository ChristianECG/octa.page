---
title: "Building gob.co.nz: A Static Corrections Register"
date: 2026-05-20
tags:
  - astro
  - static-site
  - content-architecture
  - tailwind
  - pagefind
project: gob.co.nz
status: published
---

gob.co.nz is a public corrections register for the tech industry — a *fe de erratas* that documents revised positions, failed predictions, unfulfilled promises, and dissolved consensus. Each entry is a citable URL someone sends in a conversation. The aesthetic is deliberately institutional: a government gazette that happens to be on the web.

## Stack decisions

The constraints were clear from the start: zero client-side JS unless strictly necessary, content portable as plain Markdown, fast enough to not think about performance.

**Astro 6** for static generation. Same reasoning as Octa — pure HTML by default, islands opt-in. The difference here is that Pagefind is included from day one (deferred on Octa). At content volume, client-side search is more useful than a filter bar alone.

**Tailwind CSS v4** via `@tailwindcss/vite` directly in `astro.config.mjs`. The old `@astrojs/tailwind` integration is incompatible with Tailwind v4 — it targets the v3 PostCSS plugin. The correct setup:

```js
// astro.config.mjs
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  vite: {
    plugins: [tailwindcss()],
  },
});
```

No `@astrojs/tailwind` in integrations. CSS theme tokens live in `@theme {}` blocks inside `global.css`.

**iA Writer Quattro** via `@fontsource`. Monospace with document aesthetics — fits the bureaucratic design brief without adding a separate font-loading strategy.

## Content model

Four entry types, each a different failure mode:

```
posicion-revisada    → industry used to say X, now says Y
promesa-incumplida   → someone said X would happen, it didn't
prediccion-fallida   → X was forecasted, the opposite occurred
consenso-disuelto    → everyone agreed on X, no longer do
```

Each entry has structured fields (`declaration`, `origin`, `origin_year`, `correction`, `cause`, `status_since`) plus optional body markdown. The constraint: if `correction` can't reflect documented consensus — not an opinion — the entry isn't ready to publish.

## Astro 6 Content Layer API footguns

Three breaking changes from Astro 4/5 that aren't obvious from the migration docs:

**Config location.** Content collection config must be at `src/content.config.ts`, not `src/content/config.ts`. The old path silently fails.

**Glob loader required.** Collections no longer auto-discover content. Every collection needs an explicit loader:

```ts
import { glob } from 'astro/loaders';

const erratas = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/erratas' }),
  schema: z.object({ ... }),
});
```

**`render()` is a module import, not an instance method.** In Astro 4 you'd call `entry.render()`. In Astro 6:

```ts
import { render } from 'astro:content';

const { Content } = await render(entry);
```

Calling `entry.render()` throws at runtime with no useful error message.

## OG image generation

Per-entry OG images are generated at build time using `sharp` to convert SVG to PNG. The SVG is composed in TypeScript — layout, type badge with color, title wrapping, subtitle.

Two issues that took iteration to fix:

**Font rendering in SVG.** The original used iA Writer Quattro for the OG image — predictably, `librsvg` (what `sharp` uses internally) doesn't have that font. The SVG renders with a fallback that breaks the layout. Fix: use `Arial, Helvetica, sans-serif` in the SVG. Predictable across environments.

**Title overflow.** `wrapText()` was splitting at 52 characters assuming 52px font. At 52px on a 1040px canvas, the actual character limit is ~26 for proportional fonts. The fix is to split conservatively (maxChars=26) and cap at 2 lines, truncating with `…` if needed.

`text-transform: uppercase` doesn't work in SVG attributes — apply `.toUpperCase()` in JS before inserting the text node.

## Pagefind

Pagefind runs post-build as a separate command:

```json
"build": "astro build && pagefind --site dist"
```

It requires a `data-pagefind-body` attribute on the content container. Without it, Pagefind indexes all pages including nav and footer text. With it, pages without the attribute are excluded — which means the index is scoped to entry bodies only.

Not available in dev. The tradeoff is acceptable: search is a production concern.

## git hygiene

The `.astro/` directory (generated files: content modules, data store, type declarations) was committed by mistake in the initial setup — the bootstrapped `.gitignore` only excluded `node_modules/` and `dist/`. The fix:

```bash
git rm -r --cached .astro/
```

Then add `.astro/` to `.gitignore`. This removes the directory from the index without deleting local files, so Astro's dev server continues working.

## Design system

The design brief was "government gazette" — white background, dense information, no decoration. Three decisions that define the aesthetic:

**Color only for type classification.** Each of the four entry types has one muted color used exclusively for its badge. No other color in the UI except structural rules.

**Dark mode via CSS custom properties.** All colors are `var(--color-*)` tokens. The `@media (prefers-color-scheme: dark)` block overrides the tokens — no class toggling, no JS. The dark palette is soft: `#1e1e1b` background, not pure black.

**Band colors decoupled from paper.** The header masthead is a dark band (`--color-band-bg`). In dark mode, if the band uses the paper color as text and the paper color inverts, the contrast breaks. The fix: dedicated `--color-band-text` and `--color-band-muted` tokens that are independent of `--color-paper`, so the band stays legible regardless of mode.
