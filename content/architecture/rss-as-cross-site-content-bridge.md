---
title: "RSS as a cross-site content bridge in Astro SSG"
date: 2026-05-24
tags:
  - rss
  - astro
  - static-site
  - github-actions
  - ci-cd
  - architecture
status: published
pinned: false
---

Two static sites. One is a portfolio ([christianecg.com](https://christianecg.com)), built with Astro and deployed to GitHub Pages. The other is this notebook ([octa.page](https://octa.page)), where active writing happens. The portfolio had a `/blog` section — but all the articles in it were from 2021–2022. The writing had moved to octa.page and the two were completely siloed.

The technical debt: a blog section showing stale content while the active equivalent existed elsewhere and neither site knew about the other.

## Why RSS and not something else

The options were roughly:

1. **Shared CMS or database** — overkill for two static sites. Introduces infrastructure neither site needs.
2. **Git submodule or monorepo** — couples the two repos, complicates deploys.
3. **Direct fetch from the octa.page source files** — would require shared repo access and tight coupling.
4. **RSS** — octa.page already exposes `/rss.xml`. It's a stable contract. Stateless, versionless, requires nothing from the consumer.

RSS wins by elimination. It's also the right abstraction: octa.page doesn't need to know christianecg.com exists. The feed is an implementation detail of octa's public interface, consumed unilaterally.

## Build-time consumption in Astro

Astro SSG runs `fetch` at build time in the page's frontmatter. No runtime, no hydration — the HTML is generated once with whatever the feed returns at that moment.

```typescript
let octaArticles: Article[] = [];
try {
  const res = await fetch('https://octa.page/rss.xml');
  const xml = await res.text();
  octaArticles = [...xml.matchAll(/<item>([\s\S]*?)<\/item>/g)].flatMap(([, item], i) => {
    const title = item.match(/<title>(.*?)<\/title>/)?.[1]?.trim() ?? '';
    const link  = item.match(/<link>(.*?)<\/link>/)?.[1]?.trim() ?? '';
    const pub   = item.match(/<pubDate>(.*?)<\/pubDate>/)?.[1]?.trim() ?? '';
    const tags  = [...item.matchAll(/<category>(.*?)<\/category>/g)].map(m => m[1]);
    const date  = pub ? new Date(pub).toISOString().split('T')[0] : '';
    if (!title || !date) return [];
    return [{ id: `octa-${i}`, title, date, excerpt: '', tags, source: 'Octa', url: link, external: true, idx: 0 }];
  });
} catch {
  // RSS fetch failed — show only local articles
}
```

A few constraints drive the implementation:

**No DOMParser in Node.js.** Browser APIs aren't available in the build context. Regex over the raw XML string is the pragmatic choice for a feed this simple. A proper XML parser (`fast-xml-parser` etc.) would be justified if the feed had CDATA sections or nested namespaces — this one doesn't.

**Graceful degradation is non-negotiable.** A failed `fetch` during build shouldn't break the site. The `try/catch` ensures the page builds with only local articles if the feed is unreachable.

**Merging and sorting happen in-process.** Local articles and RSS articles are normalized to the same `Article` type, merged into a single array, and sorted by date. The `external` flag drives rendering decisions (badge, `target="_blank"`, `↗` vs `→`).

## The freshness problem

Build-time consumption means the portfolio goes stale as soon as octa.page publishes something new. The obvious mitigation — a scheduled nightly rebuild — has the wrong model: it rebuilds christianecg.com on a fixed interval regardless of whether octa.page changed.

The correct trigger is octa.page's own deploy completing.

## Cross-repo dispatch

GitHub Actions supports `repository_dispatch`: an HTTP event that triggers a workflow in another repo. The pattern:

**octa.page** dispatches after deploy:

```yaml
trigger-christianecg:
  needs: [deploy, check-content]
  if: needs.check-content.outputs.md_changed == 'true'
  runs-on: ubuntu-latest
  steps:
    - name: Trigger christianecg.com rebuild
      run: |
        curl -s -X POST \
          -H "Authorization: token ${{ secrets.CHRISTIANECG_DEPLOY_TOKEN }}" \
          -H "Accept: application/vnd.github.v3+json" \
          https://api.github.com/repos/ChristianECG/christianecg.com/dispatches \
          -d '{"event_type":"octa-deployed"}'
```

**christianecg.com** listens for the event:

```yaml
on:
  push:
    branches: [main]
  workflow_dispatch:
  repository_dispatch:
    types: [octa-deployed]
```

The `if: needs.check-content.outputs.md_changed == 'true'` condition is the key constraint. A style change, config update, or tooling commit on octa.page still triggers a full build and deploy of octa — but doesn't cascade to christianecg.com. The dispatch only fires when `.md` files are in the diff.

The `check-content` job detects this:

```yaml
check-content:
  runs-on: ubuntu-latest
  outputs:
    md_changed: ${{ steps.check.outputs.md_changed }}
  steps:
    - uses: actions/checkout@v4
      with:
        fetch-depth: 2
    - id: check
      run: |
        if git diff --name-only HEAD~1 HEAD 2>/dev/null | grep -q '\.md$'; then
          echo "md_changed=true" >> $GITHUB_OUTPUT
        else
          echo "md_changed=false" >> $GITHUB_OUTPUT
        fi
```

`fetch-depth: 2` gives access to `HEAD~1`. Without it, a shallow clone has no parent to diff against.

## Trade-offs

| | |
|---|---|
| **Freshness** | Near-zero delay when dispatch works. Falls back to manual `workflow_dispatch` if the PAT expires or the hook fails. |
| **Coupling** | One-directional. octa.page doesn't know christianecg.com exists. christianecg.com depends on the RSS contract, which is stable. |
| **Failure modes** | RSS unreachable at build time → local-only blog, no build failure. Dispatch token expired → stale portfolio until manual rebuild. |
| **Complexity added** | One PAT, one secret, ~20 lines of YAML across two repos. |

The RSS contract is the right boundary. It decouples publication from consumption, keeps both sites independently deployable, and adds no shared infrastructure.
