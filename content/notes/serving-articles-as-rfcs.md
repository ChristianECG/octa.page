---
title: "Serving every article as an RFC-style plain text document"
description: "Every article now has a /doc/:slug.txt version rendered as a classic IETF RFC: 72-column body, chronological OCTA-n numbering, numbered sections, links collected into a References section — generated at build time from the Markdown source with marked's lexer."
date: 2026-07-09
tags:
  - astro
  - plain-text
  - rfc
  - content-formats
project: octa
status: published
---

Every article on this site is now also served as an RFC-style plain text document at `/doc/:slug.txt`, alongside the existing HTML and raw Markdown (`/doc/:slug.md`) versions.

```
$ curl -s https://octa.page/doc/timezone-propagation-flow.txt | head -6
Octa Engineering Notes                                   Christian Elías
Request for Comments: OCTA-20                                  octa.page
Category: Informational                                        June 2026


     Timezone Propagation: How IANA Changes Reach Your Application
```

This site already hosts two articles about IPoAC and a real Internet Draft submitted to the IETF, so the format is on brand rather than a random gimmick.

## Format

- **Header**: classic two-column RFC header. The RFC number is the article's chronological position across the whole notebook — the first published entry is `OCTA-1`. This also keeps the header inside 72 columns, which long slugs would not.
- **Abstract**: the frontmatter `description`, verbatim.
- **Status of This Memo**: fixed IETF boilerplate, linking the canonical HTML version and the `.md` source.
- **Body**: 72-column prose with 3-space indent, `1.` / `1.1.` numbered sections from H2/H3, `o` bullets, code blocks verbatim.
- **References**: external links in the prose become `label [n]` markers, with URLs accumulated into a numbered References section at the end.
- **Footer**: `Author — Informational — [Page 1]`.

## Implementation

One static endpoint, `src/pages/doc/[slug].txt.ts`, ~170 lines, no new dependencies. Instead of using `marked`'s HTML renderer (already a dependency for the RSS feed), the endpoint walks `marked.lexer()` tokens directly and emits text: headings pick up section numbers, inline links mutate a shared `refs` array, and a 5-line word-wrapper handles the 72-column constraint. `getStaticPaths` collects all entries across collections and sorts by date to assign the OCTA number.

HTML article pages advertise both alternates:

```html
<link rel="alternate" type="text/markdown" href=".../doc/slug.md">
<link rel="alternate" type="text/plain" title="RFC-style plain text" href=".../doc/slug.txt">
```

Deliberately skipped: tables and raw HTML pass through verbatim, and real RFC pagination (58-line pages, form feeds, per-page `[Page N]` footers) is deferred until the joke proves it deserves it.
