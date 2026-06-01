---
title: "CV as Code: Generating a PDF from an Astro page with Playwright"
date: 2026-05-31
tags:
  - astro
  - playwright
  - pdf
  - tooling
status: published
---

The CV lives in `src/pages/cv-print.astro` — a fully static, print-optimized HTML page with `noindex`. Playwright visits it headlessly and saves the output to `public/`, where the download link already points.

```
pnpm dev          # start local server on :4321
pnpm cv:pdf       # run scripts/generate-cv-pdf.mjs
```

The generation script:

```js
import { chromium } from 'playwright';

const browser = await chromium.launch();
const page = await browser.newPage();

await page.goto('http://localhost:4321/cv-print', { waitUntil: 'networkidle' });
await page.pdf({
  path: 'public/Christian_Elias_Cruz_Gonzalez_esp.pdf',
  format: 'A4',
  printBackground: false,
  margin: { top: '18mm', right: '18mm', bottom: '14mm', left: '18mm' },
});

await browser.close();
```

The page uses `@page { size: A4; margin: ... }` so margins are declared twice — once in CSS for browser preview, once in `page.pdf()` for the headless render. In practice Playwright ignores `@page` margins and uses the ones passed to `pdf()`.

## Why not `astro-pdf`

`astro-pdf` hooks into the build and visits pages post-build via a preview server. That works but adds build time and a dev dependency that trails Astro major releases. A standalone script is simpler: edit the page, run `pnpm cv:pdf`, commit the PDF. No build coupling.

## ATS considerations

The resulting PDF is text-based (not a rasterized image), so ATS parsers extract content correctly. A few patterns that break ATS even in text PDFs:

- Em dashes (`—`) in date ranges — some parsers (Greenhouse, Lever) misread them as unknown characters. Use simple hyphens.
- `+N` prefix on numbers inside bullets — some parsers treat `+` as a boolean search operator. Write `más de N` or `over N`.
- `→` and `<` in prose — replace with plain text equivalents before generating.
