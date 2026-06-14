---
title: "Bifrost: what changed when a private tunnel became a public package"
description: "Design changes required to turn a single-user WebSocket tunnel into a self-hostable package: named peers with subdomain routing, scoped tokens stored as SHA-256 hashes, backpressure limits, dead connection detection, and queue drain on disconnect."
date: 2026-06-03
tags:
  - websocket
  - networking
  - architecture
  - bifrost
  - open-source
project: avelor
pinned: false
status: published
---

The [original relay](/doc/websocket-tunnel-relay/) was a single-user private tool: one hardcoded token, one active connection, no queue limits. Turning that into `@avelor/bifrost` — a package anyone can self-host — required changing every assumption that came from "only I will use this."

## Named tunnels with subdomain routing

The original relay had one fixed public URL. Bifrost introduces named peers: each client registers under a name (e.g. `preview`, `api`) and incoming requests are routed by `Host` subdomain first, path prefix second.

```javascript
function nameFromHost(host) {
  const m = (host || '').match(/^([a-z0-9][a-z0-9-]*)\.tunnel\./i);
  return m ? m[1].toLowerCase() : null;
}
```

`preview.tunnel.example.com` resolves to the `preview` peer. If no subdomain matches, the relay falls back to path-based routing (`/_bifrost/{name}`) and then to `default`. Multiple clients can be connected simultaneously — the relay holds them in a `Map<name, ws>`.

The trade-off from the original design stands: subdomain routing requires a wildcard cert and a wildcard `ServerAlias` in Apache/nginx. The relay doesn't manage those — it reads the `Host` header and trusts the upstream proxy to handle TLS.

## Token scoping

The original auth was a string equality check against a single env var. Bifrost stores tokens as SHA-256 hashes (raw value shown once at issue time, never persisted) with a `scope` field.

```javascript
function validate(raw, name) {
  const hash  = hashToken(raw);
  const entry = readTokens().find(t => t.hash === hash);
  if (!entry) return null;
  if (entry.scope === '*') return entry;
  return entry.scope === (name || 'default').toLowerCase() ? entry : null;
}
```

A token scoped to `preview` cannot connect as `api`. A token scoped to `*` connects to any name. This lets you issue short-lived per-subdomain tokens for CI environments without exposing a global credential.

Revocation is a list filter: `tokens.filter(t => t.id !== id)`. No database, no key rotation ceremony — just a JSON file and a 4-byte opaque ID for human reference.

## Backpressure

The original relay had no queue limit and no body size cap. Both are problems the moment multiple users share the same relay.

```javascript
const MAX_QUEUE = 256;
const MAX_BODY  = 10 * 1024 * 1024; // 10 MB

if (queue.size >= MAX_QUEUE) {
  errorResponse(res, 429, req);
  return;
}
```

Body limit fires early, during streaming — `req.destroy()` is called before the full body arrives, so a 100 MB upload doesn't exhaust memory before the 413 is sent.

The queue limit of 256 is conservative. Each entry holds a live `ServerResponse` reference and a timer. Unbounded queue growth under a slow or disconnected peer is the obvious failure mode.

## Dead connection detection

WebSocket `close` events aren't reliable over misbehaving networks. The relay pings every active peer every 30 seconds and terminates any that don't respond:

```javascript
setInterval(() => {
  for (const [name, ws] of peers) {
    if (ws._pingPending) {
      ws.terminate(); // forceful, no close handshake
      continue;
    }
    ws._pingPending = true;
    ws.ping();
  }
}, 30_000).unref();

ws.on('pong', () => { ws._pingPending = false; });
```

`_pingPending` is set before the ping and cleared on pong. A missed pong means the next interval fires with the flag still set. Two intervals minimum before termination — 30s for the first ping, up to 60s total for a dead connection to be evicted.

## Client resilience: 1008 means stop

The client reconnects on any unexpected close — except code `1008` (policy violation). That code means the server actively rejected the connection: bad token, name already taken, invalid path. Retrying is pointless.

```javascript
ws.on('close', (code, reason) => {
  if (intentionalClose) return;
  if (code === 1008) {
    process.stderr.write(R + 'rejected: ' + Z + (reason?.toString() || 'unauthorized') + '\n');
    cleanup(1);
    return;
  }
  scheduleReconnect();
});
```

Network errors get exponential backoff: `Math.min(1000 * 2^retries, 30_000)`. Retry counter resets on a successful `open` event, so a stable reconnection doesn't carry penalty from earlier failures.

## Queue drain on disconnect

When a peer disconnects, the relay doesn't wait for the 30-second timeouts on pending requests — it drains the queue immediately with 502:

```javascript
ws.on('close', () => {
  peers.delete(name);
  for (const [id, entry] of queue) {
    if (entry.peerName !== name) continue;
    clearTimeout(entry.timer);
    errorResponse(entry.res, 502, entry.req);
    queue.delete(id);
  }
});
```

The `peerName` stored with each queue entry is the link back. Without it, a disconnect would leave up to 256 requests hanging for 30 seconds each — a noticeable freeze for any webhook handler watching for a response.
