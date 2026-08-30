---
featureId: codex-thread-tools
pageClass: feature-page
---

<FeatureHeader />

<CaptureMedia capture-id="codex-thread-tools" caption="One Codex thread inspects and follows up with another active thread." />

## Why it exists

Related work often lives in another LastCode thread. Codex can inspect bounded context there and
send a tracked follow-up without copying the other thread's full history into the current one.

## Send a follow-up to another thread

1. Identify the current thread with `lastcode-thread current --json`.
2. List recent active threads with `lastcode-thread list --json`.
3. Read only the context you need:

   ```sh
   lastcode-thread read <thread-id> --turn-limit 5 --json
   ```

4. Send the follow-up and wait for its resulting turn:

   ```sh
   lastcode-thread send <thread-id> --message "Check the open question." --wait --timeout '10 minutes' --json
   ```

The final JSON names the exact target thread and turn. If you only need confirmation that LastCode
accepted the request, omit `--wait`.

## Recover after a timeout

Before a long wait, the command prints one `LASTCODE_WAIT_HANDLE=...` line on stderr. A timeout does
not stop the target thread. Pass the nested handle from the result to:

```sh
lastcode-thread wait '<compact-json-wait-handle>' --timeout '10 minutes' --json
```

## Limits

- The command is added to Codex sessions; do not assume the same host command exists for Claude,
  Cursor, Grok, or OpenCode.
- Targets must be active threads owned by the same running LastCode environment.
- `send --wait` cannot target the caller's current thread. Use plain `send` for a self-follow-up.
- List results are capped at 50 active threads. Read and completed-response text each have a
  64,000-character output budget.
- LastCode does not discover remote hosts. Choose an existing SSH alias and invoke that host's
  wrapper explicitly.

## Related pages

- [`lastcode-thread` command reference](/reference/lastcode-thread/)
- [Resumable project actions](/features/resumable-actions/)
