---
title: "av.js — self-hosted analytics embed"
description: "API reference for av.js: the minimal analytics snippet for Avelor-hosted projects. Covers the embed pattern, the pageview payload structure, custom event API, session ID strategy, and implementation constraints like keepalive fetches and localhost filtering."
date: 2026-05-23
tags:
  - analytics
  - javascript
  - self-hosted
project: avelor
status: published
pinned: false
---

`av.js` is a minimal analytics snippet that reports pageviews and custom events to `analytics.avelor.es/collect`. Drop a `<script>` tag, set `data-project`, done.

## Embed

```html
<script src="https://analytics.avelor.es/av.js" data-project="project-slug"></script>
```

`data-project` is required — without it the script exits immediately. Requests from `localhost`, `127.0.0.1`, and `::1` are also silently skipped.

## What it sends on load

A `POST /collect` with:

```json
{
  "project_id": "project-slug",
  "url": "/path?query",
  "referrer": "https://example.com",
  "session_id": "lxk3r2abc9d"
}
```

`session_id` is generated once per tab and stored in `sessionStorage` under `_av_sid`. It survives navigation within the tab but not across tabs or sessions.

## Custom events

```js
window.avelor.track('event-name', { key: 'value' });
```

Event name is truncated to 100 chars. `properties` is a free-form object or `null`. Full payload:

```json
{
  "type": "event",
  "project_id": "project-slug",
  "session_id": "lxk3r2abc9d",
  "name": "click-cta",
  "url": "/",
  "properties": { "variant": "A" }
}
```

## Implementation notes

- `keepalive: true` on the fetch call — the request survives page navigation, so events sent just before a redirect are not lost.
- `credentials: 'omit'` — no cookies or auth headers sent to the collector.
- Network errors are swallowed — a dead collector does not break the host page.
