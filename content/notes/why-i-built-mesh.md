---
title: "Why I Built mesh: Local Dev Proxy with Named Services and Failure Injection"
description: "mesh is a local dev proxy where services get names instead of port numbers, and a YAML rules block injects failures at the network layer — 503s, delays, per-request rates — without touching backend code or adding mocks."
date: 2026-06-01
tags:
  - proxy
  - developer-tools
  - local-development
  - fault-injection
  - nodejs
  - cli
project: mesh
status: published
---

Every fullstack project starts the same way: three terminals open, one running on `:3000`, one on `:4000`, one on `:5000`. You mix them up. You hardcode `localhost:4000` somewhere and forget to change it before pushing. You test happy paths because injecting a 503 means either touching the API code or reaching for a mock library.

`mesh` solves both problems in a single YAML file.

```yaml
services:
  app: 3000
  api: 4000

rules:
  api:
    - path: /payments
      status: 503
      rate: 30
    - path: /slow-endpoint
      delay: 2000
      rate: 100
```

`sudo mesh route` writes `/etc/hosts`, starts an HTTP/HTTPS proxy on `127.0.0.1`, and cleans up on exit. Services are available at `app.test` and `api.test`. If mkcert is installed, HTTPS is automatic.

## The failure injection part

The `rules` block is the reason this exists. It intercepts matching requests at the proxy layer — no mocks, no code changes, no test harness. You can fail 30% of `/payments` calls with a 503, delay `/slow-endpoint` by 2 seconds, or combine both. The rate is per-request, resolved at runtime via `Math.random()`.

This lets you test how your frontend handles partial outages without touching the backend at all.

## What I ruled out

- **`hotel`** — closest prior art, abandoned since 2023, no HTTPS, no failure injection.
- **Caddy / Traefik** — production-grade reverse proxies. Config overhead is real. Not what you reach for in a dev project.
- **Mocking the fetch layer** — changes test behavior vs. real behavior. The proxy intercepts at the network level, so the client code runs exactly as it would in production.

## Implementation

~400 lines of Node.js, no framework. The proxy is `http-proxy`. TLS comes from `mkcert`. Config is plain YAML parsed with `js-yaml`. Hot-reload watches the config file and mutates the in-memory service/rule maps in place so existing connections survive.

```
npm install -g @avelor/mesh
```

Repo: [github.com/avelor-es/mesh](https://github.com/avelor-es/mesh)
