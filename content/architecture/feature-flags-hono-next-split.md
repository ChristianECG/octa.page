---
title: "Separating the flag evaluation API from the dashboard in the same monorepo"
description: "Why Tessera's feature flag evaluation API runs on Hono rather than Next.js API routes — cold start latency, deployment coupling, and framework overhead — and how a shared monorepo makes the split cheap while keeping evaluation logic in one place."
date: 2026-05-25
tags:
  - feature-flags
  - hono
  - next-js
  - performance
  - monorepo
project: tessera
status: published
pinned: false
---

Tessera's monorepo has two apps:

```
apps/
  eval-api/    ← Hono (Node.js)
  dashboard/   ← Next.js App Router
```

They share types from `packages/core` but run as separate processes. The split exists because the eval API is in the hot path of every flag read in every client application, and Next.js API routes carry overhead that has no place there.

## What "hot path" means here

Every server component render, every middleware execution, every PHP page load that reads feature flags hits `POST /v1/flags`. In a Next.js app with 10 flagged code paths per request, that's one network call per page render — not ten, because the SDK fetches all flags at once and caches locally. But that one call needs to be fast.

A Hono handler on Node.js for this route is approximately:

```ts
app.post('/v1/flags', async (c) => {
  const token = await verifyToken(c.req.header('Authorization'))
  const flags = await loadFlags(token.projectId)          // memory cache, 5s TTL
  const result = evaluate(flags, await c.req.json())      // pure function, no I/O
  return c.json(result)
})
```

No framework boot, no middleware chain, no RSC runtime, no edge config resolution. The request goes in, the hashmap comes out.

## Why Next.js API routes don't belong here

Next.js API routes run inside the Next.js runtime. That runtime does useful things for a dashboard — RSC, streaming, image optimization, middleware composition — none of which matter for a JSON endpoint that does a token lookup, a cache read, and a pure function call.

The overhead isn't theoretical. Next.js API routes have:
- Cold start latency when the runtime hasn't warmed up
- A heavier request lifecycle (middleware, headers normalization, response wrapping)
- Coupling to the deployment model of the dashboard (if the dashboard is on Vercel, the API is too)

The dashboard has none of these constraints. Page loads are user-initiated, tolerate 200–400ms, and benefit from everything Next.js provides.

## The monorepo makes this cheap

Both apps live in the same repo, share types and the evaluation logic from `packages/core`, and are deployed independently. The eval-api gets its own process, its own port, its own subdomain (`flags.tessera.dev`). The dashboard is a separate Next.js app that talks to the eval-api like any other client.

```
packages/core/src/evaluator.ts
  ↑ imported by
apps/eval-api/src/routes/eval.ts   (runs the evaluation)
apps/dashboard/...                  (uses the dashboard's own API routes for CRUD)
packages/sdk-next/src/server.ts    (calls eval-api over HTTP)
```

The evaluation logic is written once in `core` and runs in both the API (at request time) and potentially in the SDK (for offline/cached evaluation). Neither app owns it.
