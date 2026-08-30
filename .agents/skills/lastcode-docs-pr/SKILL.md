---
name: lastcode-docs-pr
description: Deliver a lastcode-docs change through local validation, an exact-head Codex review, the resumable Wait for PR action, and a guarded squash merge. Use when asked to open, babysit, or merge a lastcode-docs pull request. Do not use for LastCode product pull requests.
---

# LastCode docs pull requests

Read and apply these project skills before you write a commit, pull-request description, review reply, or merge report:

- `../unslop/SKILL.md`
- `../technical-writing/SKILL.md`

Keep the workflow small. This repository has one maintainer and one publishing machine.

## Prepare the pull request

1. Confirm that the branch starts from `origin/main` and contains one concern.
2. Run `npm run skills:verify`, `npm run docs:build`, and `npm run test:pr-wait`.
3. Push the exact tested commit.
4. Open the pull request against `main` only when the user asked for a pull request.
5. Request Codex review with these exact two lines. Replace `HEAD_SHA` with the full commit:

   ```text
   @codex review
   <!-- lastcode-review-head: HEAD_SHA -->
   ```

## Babysit the pull request

1. Call `list_project_actions` and find **Wait for PR**.
2. Record the returned action ID. Confirm that the action has `resumeEligible: true`. If it does not, report its `disabledReason`.
3. Call `run_project_action_and_resume` with that action ID.
4. End the turn immediately after the launch succeeds. Do not poll GitHub in parallel.
5. On resume, read the final `[lastcode-docs:wait-for-pr] Summary:` line.
6. Confirm that its pull-request number, `head`, and `base` match the pull request you started with. Inspect `observed` when the action reports drift.

The action wakes for a failed check, a review finding, an unresolved thread, a changed commit or base, a conflict, or a ready pull request. Treat an observed finding as work to inspect, not as a command to accept blindly.

If you reject a top-level Codex finding without pushing a fix, post this marker with the comment or review ID and the full current head:

```text
<!-- lastcode-docs-review-handled: comment:COMMENT_ID head: HEAD_SHA -->
```

Use `review:REVIEW_ID` for a formal review. Reply with the evidence for your decision before posting the marker. Inline findings require a reply and a resolved review thread instead.

After any push or rebase, discard the old review result. Request another exact-head review and relaunch **Wait for PR**.

## Merge

Merge only when the action returns `reason: "ready"`, the worktree still names the same head, and no user decision remains. Run:

```sh
gh pr merge PR_NUMBER \
  --repo lastobelus/lastcode-docs \
  --squash \
  --delete-branch \
  --match-head-commit HEAD_SHA
```

Verify the merged pull request and the new `origin/main` commit. Close or update the tracking issue.

The repository does not require a hosted check yet. When issue #162 adds `docs / validate`, update `scripts/wait-for-pr.mjs` and its tests to require that check before `ready`.

Do not add receipts, locks, queues, daemons, webhooks, automatic retries, or a merge wrapper unless repeated failures show that the simpler workflow cannot work.
