---
title: "floo: a minimal deploy agent for self-hosted VPS"
description: "floo runs an HTTP deploy agent on the server with YAML-defined project steps, scoped tokens stored as SHA-256 hashes, and real-time log streaming via SSE. systemd as the process supervisor, no Docker, no managed platforms."
date: 2026-06-06
tags:
  - deploy
  - nodejs
  - cli
  - self-hosted
  - systemd
project: floo
status: published
---

Every VPS deployment ends up as the same ritual: SSH in, `git pull`, `npm install`, `pm2 restart`. Automating it properly means either exposing SSH credentials to CI or paying for a platform that wraps a container runtime you don't need.

`floo` runs an HTTP agent on the server. You configure projects and their steps in a YAML file. You issue tokens — one per project, scoped, shown once, stored hashed. From your machine or a CI pipeline, you run `floo myapp` and the deploy logs stream back in real time via SSE.

```yaml
projects:
  avelor.es:
    cwd: /var/www/html/avelor.es
    steps:
      - git fetch origin master
      - git reset --hard origin/master
      - npm ci
      - pm2 restart avelor --update-env
```

```bash
floo avelor.es
→ deploying avelor.es  4 steps
[1/4] git fetch origin master ✓
[2/4] git reset --hard origin/master ✓
...
```

## Architecture decisions

**Tokens hashed at rest.** SHA-256, shown once at issuance. The server stores no raw token — a dump of the token file is useless to an attacker.

**Per-project token scoping.** A token for `avelor.es` returns 403 against any other project name. A compromised token can't enumerate projects or deploy anything else.

**SSE for log streaming.** No WebSocket, no polling. The response is a `text/event-stream` that stays open while steps execute. `floo` the client reads it and prints each line as it arrives.

**systemd as the process supervisor.** `floo agent install` writes and enables a systemd unit. No wrapper scripts, no custom daemon logic, no PID file juggling. `systemctl restart floo` is the ops interface.

## What I ruled out

- **Webhook-only approaches** — no streaming, no live feedback during a deploy.
- **Docker-based solutions** — the sites running on this VPS are PHP + Node apps. A container runtime is overhead that doesn't pay for itself.
- **Managed platforms** — Render, Railway, Fly — each has constraints on build environment or charges for what's effectively a small Node process and a git pull.

## Implementation

~700 lines of Node.js across six modules. The agent is a plain `http.createServer`. Steps run as `sh -c <cmd>` subprocesses with stdout/stderr piped back line by line. The client is a fetch loop over the SSE response. Config is YAML via `js-yaml`, tokens stored as JSON.

Release pipeline builds platform binaries via Node SEA (Single Executable Applications) and publishes to npm and a Homebrew tap on each tag.

```bash
npm install -g @avelor/floo
```

v0.2.1. Repo: [github.com/avelor-es/floo](https://github.com/avelor-es/floo)
