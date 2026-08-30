---
featureId: resumable-actions
pageClass: feature-page
---

<FeatureHeader />

<CaptureMedia
  capture-id="resumable-actions"
  caption="A project Action keeps running while the thread waits for its result."
/>

## Why it exists

Long-running commands should not need an agent to spend turns asking whether they have finished.
A resumable Action runs in its own terminal, lets the agent pause, and sends one follow-up when the
result is ready.

## Before you start

Create a Project Action for the command you want to run. In the Action editor, enable
**Allow Codex and Claude to run and resume**, then save it.

The command should print one concise final line with the result the agent needs next. The full
terminal remains available for longer output.

## Run an Action and pause the thread

1. Ask Codex or Claude to run the named Project Action.
2. Confirm that LastCode opens the Action in a dedicated terminal.
3. Let the agent end its turn while the command continues.
4. Wait for LastCode to return the result to the same thread.

The Action keeps running if you send another message. LastCode delivers the automatic follow-up
only after the command has finished and the thread is idle.

## Read the thread state

| State | What it means |
| --- | --- |
| **Working** | The agent is still taking a turn. A yellow Action indicator remains visible beside the normal working state. |
| **Waiting** | The agent is idle, but the Action is still running. LastCode is waiting to deliver its result. |

On web and desktop, hover the yellow sidebar indicator to see the Action name. The composer also
shows a yellow Action bar with its name, elapsed time, and current state.

## Inspect or cancel the Action

Select the Action bar above the composer to disclose its command and controls.

- **Open terminal** shows the live command output.
- **Cancel Action** stops the command. When the thread is idle, the agent receives a follow-up with
  the cancellation and the available output.

Completed output is collapsed by default. Expand its compact card to read the captured output
tail, or return to the dedicated terminal for the full output.

## Recover an interrupted follow-up

If LastCode restarts after the command finishes but before its follow-up is delivered, the thread
shows that delivery was interrupted.

- Choose **Resume agent** to deliver the saved follow-up.
- Choose **Discard** to remove it.

LastCode does not rerun the command during recovery.

## Limits

- Agent-triggered resumable Actions must be enabled individually in project settings.
- The resumable launch path is for Codex and Claude; other providers can still use ordinary Project
  Actions without this automatic follow-up.
- This guide covers the shared web and desktop controls. Mobile is available in the product
  registry, but its instructions and media remain withheld until maintainer QA is available.

## Related pages

- [Install LastCode](/install/)
- [Codex thread tools](/features/codex-thread-tools/)
- [Feature availability](/reference/feature-availability/)
