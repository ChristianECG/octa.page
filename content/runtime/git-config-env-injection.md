---
title: "Injecting git config per-process with GIT_CONFIG_KEY_n"
description: "Injecting git safe.directory per-process via GIT_CONFIG_COUNT and GIT_CONFIG_KEY_n environment variables — no file writes, no sudo — the correct fix for deploy agents running as root against repositories owned by www-data."
date: 2026-06-07
tags:
  - git
  - deploy
  - linux
  - systemd
status: published
---

Git refuses to operate on a repository owned by a different user than the current process:

```
fatal: detected dubious ownership in repository at '/var/www/html/avelor.es'
To add an exception for this directory, call:
    git config --global --add safe.directory /var/www/html/avelor.es
```

The standard fix is `git config --global --add safe.directory <path>`, which writes to `~/.gitconfig`. This silently fails when the process running git has a different home directory — a systemd service running as root, for instance, has `/root/.gitconfig`, not the user's.

## The env var approach

Since git 2.31, config can be injected per-process via environment variables without touching any file on disk:

```
GIT_CONFIG_COUNT=1
GIT_CONFIG_KEY_0=safe.directory
GIT_CONFIG_VALUE_0=*
```

This adds `safe.directory = *` to the config for that process only. The wildcard trusts all directories.

In Node.js, when spawning deploy subprocesses:

```js
const env = Object.assign({}, process.env, {
  GIT_CONFIG_COUNT: '1',
  GIT_CONFIG_KEY_0: 'safe.directory',
  GIT_CONFIG_VALUE_0: '*',
}, extraEnv); // project-level env overrides last
```

No `gitconfig` writes, no `sudo`, no per-repo exception lists to maintain. The config lives in the process environment and disappears with it.

## When this matters

Any deploy agent that runs as root (or a different user than the web server) and executes git commands against repos owned by `www-data` or another service account hits this. Running `git config --global` as your shell user does nothing for that process.
