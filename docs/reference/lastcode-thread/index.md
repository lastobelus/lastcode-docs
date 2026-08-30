---
title: lastcode-thread
description: Command reference for LastCode thread tools.
---

# `lastcode-thread`

`lastcode-thread` is the command LastCode adds to supported Codex sessions for inspecting and
messaging active threads in the same environment.

## Commands

```sh
lastcode-thread current --json
lastcode-thread list --json
lastcode-thread read <thread-id-or-unique-prefix> --turn-limit 5 --json
lastcode-thread send <thread-id-or-unique-prefix> --message <text> --json
lastcode-thread send <thread-id-or-unique-prefix> --message <text> --wait --timeout '10 minutes' --json
lastcode-thread wait '<compact-json-wait-handle>' --timeout '10 minutes' --json
```

Exact thread IDs win. A prefix must identify exactly one active thread. Archived and deleted
threads are excluded.

## Result bounds

| Command | Bound |
| --- | --- |
| `list` | 50 most recently updated active threads |
| `read` | One 64,000-character text budget plus bounded activity records |
| completed `send --wait` or `wait` | 64,000 response characters |

Truncated JSON results say which text or counts were cut.

## Send results

Plain `send` reports `kind: "accepted"` after LastCode persists the request. Acceptance does not
mean the provider has finished the turn.

`send --wait` returns the exact resulting turn. It writes a compact recovery handle to stderr
before waiting. On timeout or an unknown transport/dispatch result, keep the nested handle and pass
it to `wait`; the target turn is not cancelled.

## Host and runtime limits

- The owning LastCode server must be running. The command never edits an offline database.
- The bundled launcher is available on POSIX Node hosts and packaged macOS. Windows and packaged
  Linux AppImage Codex sessions do not currently receive it.
- To use another machine, choose its SSH alias and call
  `~/.lastcode/userdata/bin/lastcode-thread` there. Use the explicit userdata path when that host
  has a custom LastCode home.
- LastCode does not discover hosts or read SSH configuration for you.

## Related guide

See [Codex thread tools](/features/codex-thread-tools/) for one complete inter-thread workflow.
