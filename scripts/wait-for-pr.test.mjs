import assert from "node:assert/strict";
import test from "node:test";

import { decide, deriveCheckState, deriveReviewState, summary } from "./wait-for-pr.mjs";

const HEAD = "1111111111111111111111111111111111111111";
const BASE = "2222222222222222222222222222222222222222";
const CODEX = { login: "chatgpt-codex-connector[bot]" };

function request(id = 1) {
  return {
    id,
    user: { login: "lastobelus" },
    author_association: "OWNER",
    body: `@codex review\n<!-- lastcode-review-head: ${HEAD} -->`,
    created_at: "2026-08-30T10:00:00Z",
  };
}

function cleanComment(id = 2, head = HEAD) {
  return {
    id,
    user: CODEX,
    body: `Codex Review: Didn't find any major issues. Hooray!\n\n**Reviewed commit:** \`${head}\``,
    created_at: "2026-08-30T10:01:00Z",
  };
}

function reviewState(overrides = {}) {
  return deriveReviewState({
    head: HEAD,
    formalReviews: [],
    issueComments: [request()],
    reviewComments: [],
    requestReactions: [],
    ...overrides,
  });
}

function observation(overrides = {}) {
  return {
    local: { branch: "docs/example", head: HEAD, clean: true },
    pullRequest: {
      number: 4,
      url: "https://github.com/lastobelus/lastcode-docs/pull/4",
      state: "OPEN",
      isDraft: false,
      headRefOid: HEAD,
      baseRefOid: BASE,
      baseRefName: "main",
      mergeable: "MERGEABLE",
      mergeStateStatus: "CLEAN",
    },
    checks: "passed",
    review: { requestPresent: true, pending: false, ready: true },
    unresolvedReviewThreads: 0,
    ...overrides,
  };
}

test("ignores a clean review for an old head", () => {
  const state = reviewState({
    issueComments: [request(), cleanComment(2, "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa")],
  });
  assert.equal(state.pending, true);
  assert.equal(state.ready, false);
});

test("waits while the exact-head request has an eyes reaction", () => {
  const state = reviewState({
    requestReactions: [
      {
        id: 3,
        user: CODEX,
        content: "eyes",
        created_at: "2026-08-30T10:00:01Z",
      },
    ],
  });
  assert.equal(state.pending, true);
  assert.equal(state.ready, false);
});

test("accepts an exact-head clean comment", () => {
  const state = reviewState({ issueComments: [request(), cleanComment()] });
  assert.equal(state.pending, false);
  assert.equal(state.ready, true);
});

test("wakes for an unhandled top-level finding", () => {
  const finding = {
    id: 2,
    user: CODEX,
    body: `Codex Review: Found one issue.\n\n**Reviewed commit:** \`${HEAD}\``,
    created_at: "2026-08-30T10:01:00Z",
  };
  const current = observation({ review: reviewState({ issueComments: [request(), finding] }) });
  assert.deepEqual(decide(observation(), current), { reason: "review-finding", wait: false });
});

test("accepts a handled marker for a body-only finding", () => {
  const finding = {
    id: 2,
    user: CODEX,
    body: `Codex Review: Found one issue.\n\n**Reviewed commit:** \`${HEAD}\``,
    created_at: "2026-08-30T10:01:00Z",
  };
  const marker = {
    id: 3,
    user: { login: "lastobelus" },
    author_association: "OWNER",
    body: `<!-- lastcode-docs-review-handled: comment:2 head: ${HEAD} -->`,
    created_at: "2026-08-30T10:02:00Z",
  };
  const state = reviewState({ issueComments: [request(), finding, marker] });
  assert.equal(state.pending, false);
  assert.equal(state.ready, true);
});

test("classifies absent, pending, successful, and failed checks", () => {
  assert.equal(deriveCheckState([]), "passed");
  assert.equal(deriveCheckState([{ status: "IN_PROGRESS", conclusion: null }]), "pending");
  assert.equal(deriveCheckState([{ status: "COMPLETED", conclusion: "SUCCESS" }]), "passed");
  assert.equal(deriveCheckState([{ status: "COMPLETED", conclusion: "FAILURE" }]), "failed");
  assert.equal(deriveCheckState([{ status: "COMPLETED", conclusion: "ERROR" }]), "failed");
  assert.equal(
    deriveCheckState([{ status: "COMPLETED", conclusion: "STARTUP_FAILURE" }]),
    "failed",
  );
});

test("wakes when a review thread is unresolved", () => {
  const current = observation({ unresolvedReviewThreads: 1 });
  assert.deepEqual(decide(observation(), current), {
    reason: "review-unresolved",
    wait: false,
  });
});

test("covers pull-request drift and actionable states", () => {
  const baseline = observation();
  const cases = [
    [observation({ local: { ...baseline.local, clean: false } }), "worktree-changed"],
    [
      observation({ local: { ...baseline.local, head: "3333333333333333333333333333333333333333" } }),
      "local-head-changed",
    ],
    [
      observation({
        pullRequest: {
          ...baseline.pullRequest,
          headRefOid: "3333333333333333333333333333333333333333",
        },
      }),
      "head-changed",
    ],
    [
      observation({
        pullRequest: {
          ...baseline.pullRequest,
          baseRefOid: "4444444444444444444444444444444444444444",
        },
      }),
      "base-changed",
    ],
    [observation({ pullRequest: { ...baseline.pullRequest, isDraft: true } }), "pr-draft"],
    [
      observation({
        pullRequest: { ...baseline.pullRequest, mergeable: "CONFLICTING" },
      }),
      "merge-blocked",
    ],
    [
      observation({
        pullRequest: { ...baseline.pullRequest, mergeStateStatus: "BEHIND" },
      }),
      "merge-blocked",
    ],
    [
      observation({
        pullRequest: { ...baseline.pullRequest, mergeStateStatus: "BLOCKED" },
      }),
      "merge-blocked",
    ],
    [
      observation({ pullRequest: { ...baseline.pullRequest, number: 5 } }),
      "pr-changed",
    ],
    [
      observation({ pullRequest: { ...baseline.pullRequest, state: "MERGED" } }),
      "pr-closed",
    ],
    [
      observation({ pullRequest: { ...baseline.pullRequest, baseRefName: "preview" } }),
      "unexpected-base",
    ],
    [observation({ checks: "failed" }), "checks-failed"],
    [
      observation({ review: { requestPresent: false, pending: false, ready: false } }),
      "review-not-requested",
    ],
  ];
  for (const [current, reason] of cases) {
    assert.equal(decide(baseline, current).reason, reason);
  }
});

test("returns ready only after checks and review finish", () => {
  assert.deepEqual(decide(observation(), observation()), { reason: "ready", wait: false });
  assert.deepEqual(decide(observation(), observation({ checks: "pending" })), {
    reason: "checks-pending",
    wait: true,
  });
  assert.deepEqual(
    decide(
      observation(),
      observation({ review: { requestPresent: true, pending: true, ready: false } }),
    ),
    { reason: "review-pending", wait: true },
  );
  assert.deepEqual(
    decide(
      observation(),
      observation({
        pullRequest: {
          ...observation().pullRequest,
          mergeable: "UNKNOWN",
          mergeStateStatus: "UNKNOWN",
        },
      }),
    ),
    { reason: "mergeability-pending", wait: true },
  );
});

test("binds the final summary to the pull request and exact revisions", () => {
  assert.deepEqual(summary("ready", observation()), {
    reason: "ready",
    pr: 4,
    url: "https://github.com/lastobelus/lastcode-docs/pull/4",
    head: HEAD,
    base: BASE,
    observed: { pr: 4, head: HEAD, base: BASE },
    checks: "passed",
    review: "clean",
    unresolvedReviewThreads: 0,
  });
});

test("keeps expected and observed revisions when the pull request drifts", () => {
  const current = observation({
    pullRequest: {
      ...observation().pullRequest,
      headRefOid: "3333333333333333333333333333333333333333",
      baseRefOid: "4444444444444444444444444444444444444444",
    },
  });
  assert.deepEqual(summary("head-changed", observation(), current), {
    reason: "head-changed",
    pr: 4,
    url: "https://github.com/lastobelus/lastcode-docs/pull/4",
    head: HEAD,
    base: BASE,
    observed: {
      pr: 4,
      head: "3333333333333333333333333333333333333333",
      base: "4444444444444444444444444444444444444444",
    },
    checks: "passed",
    review: "clean",
    unresolvedReviewThreads: 0,
  });
});
