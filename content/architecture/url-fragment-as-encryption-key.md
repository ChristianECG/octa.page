---
title: "Using the URL fragment as an encryption key carrier"
description: "Client-side AES-256-GCM encryption where the key lives exclusively in the URL fragment — never transmitted to the server. The design, the constraints around browser history and intermediaries, and why out-of-band key delivery defeats the UX goal."
date: 2026-05-22
tags:
  - cryptography
  - web-crypto
  - security
  - architecture
project: avelor
status: published
pinned: false
---

The URL fragment (`#everything-after-the-hash`) is never sent to the server. Browsers strip it before making the HTTP request. This makes it a natural channel for passing a secret that the server must never see — specifically, an encryption key for a one-time secret.

## The design

When a secret is created:

1. The browser generates a random AES-256-GCM key via `crypto.subtle.generateKey`.
2. It encrypts the plaintext locally. The encrypted blob (IV + ciphertext) is sent to the server as the `content` field.
3. The server stores only the ciphertext. It has no key and cannot decrypt.
4. The share URL is constructed as `https://vault.example.com/s/{token}#{key_b64u}`.

```javascript
async function encryptContent(plaintext) {
  const key    = await crypto.subtle.generateKey({ name: 'AES-GCM', length: 256 }, true, ['encrypt']);
  const iv     = crypto.getRandomValues(new Uint8Array(12));
  const cipher = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, new TextEncoder().encode(plaintext));
  const rawKey = new Uint8Array(await crypto.subtle.exportKey('raw', key));

  const combined = new Uint8Array(iv.byteLength + cipher.byteLength);
  combined.set(iv);
  combined.set(new Uint8Array(cipher), iv.byteLength);

  return {
    content: toBase64url(combined),  // sent to server
    keyB64:  toBase64url(rawKey),    // goes in the URL fragment
  };
}
```

When the recipient opens the link:

1. The browser reads `location.hash.slice(1)` — the key, which was never sent to the server.
2. It POSTs to the token URL. The server marks the secret as viewed (`viewed_at = NOW()`) and returns the ciphertext.
3. The browser decrypts locally.

```javascript
const keyB64   = location.hash.slice(1);
const rawKey   = base64urlToBytes(keyB64).buffer;
const key      = await crypto.subtle.importKey('raw', rawKey, { name: 'AES-GCM', length: 256 }, false, ['decrypt']);

const res      = await fetch(location.pathname, { method: 'POST' });
const data     = await res.json();  // { ok: true, content: "<base64url>" }

const combined = base64urlToBytes(data.content);
const iv       = combined.slice(0, 12);
const cipher   = combined.slice(12);
const plain    = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, cipher);
```

## What the server knows

| Field | Stored | Value |
|-------|--------|-------|
| Token | Yes | Random 32-byte hex |
| Ciphertext | Yes | AES-GCM output |
| Key | No | Never transmitted |
| Plaintext | No | Never transmitted |
| `viewed_at` | Yes | Timestamp of first reveal |

A server compromise exposes token metadata and ciphertext. Without the key — which only exists in the URL fragment and the recipient's clipboard — the ciphertext is opaque.

## Constraints

**The fragment is in browser history.** If the recipient's browser syncs history, the key travels with it. For very high-sensitivity secrets, recipients should open the link in a private window and clear it afterward.

**One-time enforcement is server-side only.** The burn semantics (set `viewed_at`, return 410 on subsequent requests) happen on the server. A network-level attacker who can observe and replay the POST before the server processes it could retrieve the ciphertext twice. Without the fragment key, ciphertext copies are equivalent — but it means "one-time" is a server policy, not a cryptographic guarantee.

**The key is in the URL.** Any proxy, CDN, or browser extension that logs full URLs will capture the key. The fragment exclusion is a browser-to-server guarantee — intermediaries that inspect the page before the browser processes it are outside the model.

## Why not a separate key delivery channel?

Delivering the key out-of-band (email, SMS) and the ciphertext via a link would be more secure — but it defeats the purpose of a self-contained share link. The fragment approach makes the UX of "share one link" possible while keeping the server out of the trust chain for anything that happens before the browser sends the request.
