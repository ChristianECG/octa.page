---
title: "Feature flag services don't store user IDs — and the consequence of that"
description: "Tessera stores no user records — rollout consistency comes from deterministic hashing, not a user registry. The consequence: exposure analytics require a separate events table. How LaunchDarkly, Statsig, and PostHog Flags handle the same tradeoff."
date: 2026-05-26
tags:
  - feature-flags
  - architecture
  - privacy
project: tessera
status: published
pinned: false
---

Tessera holds no record of which users exist. No user table, no user IDs, no stored profiles. The evaluation endpoint receives a context and returns a result. Nothing persists about the user.

This is not a privacy decision primarily — it's a correctness decision. Storing users would require a registration step that creates a coordination problem: a user must exist in Tessera before they can be evaluated. That's a distributed state dependency with no benefit.

## How evaluation stays consistent without storage

For percentage rollouts, consistency comes from the hash being deterministic:

```
bucket = murmur3(flagId + userId) % 100
enabled = bucket < rolloutPercentage
```

Same `userId`, same `flagId`, always the same `bucket`. The result is stable across requests, across servers, across time — without ever writing the user ID to a database.

For user-list rules, the rule itself stores the IDs (`userId IN ['a1b2', 'c3d4', ...]`). Tessera knows who gets the flag because the operator explicitly listed them, not because users were registered.

## The consequence

If you need to answer "how many users currently have this flag active?" — you can't. Not without evaluating every user ID you know about, one by one.

The correct solution is exposure events: the SDK reports each flag read back to a collection endpoint.

```ts
// POST /v1/events
{
  "events": [
    { "flag": "nueva-ui", "userId": "a1b2c3d4", "value": true }
  ]
}
```

The events table becomes the source of truth for analytics. This is how LaunchDarkly, Statsig, and PostHog Flags work internally. The dashboard's impression counts come from event aggregation, not from querying a user registry.

Without exposure events, the service is still complete for controlling rollouts. You just can't measure exposure rates until you add the reporting layer.

## What Tessera does store about users

One thing only: user-level overrides.

```sql
user_overrides (flag_id, environment, platform_user_id, value)
```

When an operator adds a specific user to a permanent override (beta tester, internal account), that `platform_user_id` is written. It's stored as an opaque string — whatever the client passes. Tessera doesn't know or care what it represents.
