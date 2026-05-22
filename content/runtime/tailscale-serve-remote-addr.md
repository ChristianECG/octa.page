---
title: "tailscale serve sets REMOTE_ADDR to 127.0.0.1 for every request"
date: 2026-05-21
tags:
  - tailscale
  - php
  - security
  - networking
project: avelor
status: published
pinned: false
---

`tailscale serve` terminates HTTPS at the Tailscale layer and forwards plain HTTP to a local backend. From the application's perspective, every request originates at `127.0.0.1` — regardless of which Tailscale node made the request. This collapses the identity of all callers to the loopback address.

## Why it matters

The typical pattern for Tailscale-gated PHP apps is to check `REMOTE_ADDR` against the Tailscale CGNAT range (`100.64.0.0/10`) or to trust the `Tailscale-User-Login` header injected by `tailscale serve`. These two signals are mutually exclusive:

- If you check `REMOTE_ADDR` for Tailscale IPs → you get the real node IP, but `tailscale serve` is not in the picture (you're listening directly on the Tailscale interface or binding to the node's IP).
- If you rely on `Tailscale-User-Login` → the proxy is in the picture, and `REMOTE_ADDR` is `127.0.0.1`.

A guard like this silently bypasses all auth when `tailscale serve` is the deployment method:

```php
$isLocal = in_array($_SERVER['REMOTE_ADDR'], ['127.0.0.1', '::1'], true);
if ($isLocal) return; // exits before checking Tailscale-User-Login
```

The `Tailscale-User-Login` branch is never reached. Every request is treated as a trusted local caller.

## The fix

Drop the `REMOTE_ADDR` shortcut entirely. When `tailscale serve` is the proxy, the only reliable identity signal is the injected header:

```php
function requireTailscaleAuth(): void
{
    $login = $_SERVER['HTTP_TAILSCALE_USER_LOGIN'] ?? '';
    if ($login !== 'allowed@example.com') {
        http_response_code(403);
        header('Content-Type: text/plain');
        echo 'Forbidden';
        exit;
    }
}
```

The `isLocal` escape hatch is often added for local development. It's unnecessary: dev environments using `php -S` route through a custom router that doesn't call the auth function, so removing the bypass doesn't break anything.

## The underlying mechanic

`tailscale serve` is a reverse proxy, not a network-layer filter. It listens on the Tailscale interface, handles TLS, injects identity headers, and makes a new outbound connection to `localhost:PORT`. The application sees a fresh TCP connection from the loopback. There is no X-Forwarded-For or equivalent by default — the node IP is only available in the injected `Tailscale-User-*` headers.

This is architecturally correct behavior for a proxy, but it breaks assumptions borrowed from traditional firewall-based access control where IP address implies identity.
