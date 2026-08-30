#!/usr/bin/env node

import { execFileSync } from "node:child_process";

const REPOSITORY = "lastobelus/lastcode-docs";
const BASE_BRANCH = "main";
const CODEX_BOT = "chatgpt-codex-connector[bot]";
const TRUSTED_ASSOCIATIONS = new Set(["OWNER", "MEMBER", "COLLABORATOR"]);
const POLL_INTERVAL_MS = 60_000;
const REVIEW_TIMEOUT_MS = 30 * 60_000;
const MERGE_TIMEOUT_MS = 10 * 60_000;
const SUMMARY_PREFIX = "[lastcode-docs:wait-for-pr] Summary: ";
let failureBaseline;

function run(command, args) {
  return execFileSync(command, args, {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
    timeout: 30_000,
    maxBuffer: 16 * 1024 * 1024,
  }).trim();
}

function runJson(command, args) {
  return JSON.parse(run(command, args));
}

function flattenPages(value) {
  return value.flatMap((page) => page);
}

function timestamp(value) {
  const parsed = value ? Date.parse(value) : Number.NaN;
  return Number.isNaN(parsed) ? 0 : parsed;
}

function headMatches(candidate, head) {
  return typeof candidate === "string" && candidate.length >= 7 && head.startsWith(candidate);
}

function reviewedCommit(body = "") {
  if (!body.startsWith("Codex Review:")) return null;
  return /\*\*Reviewed commit:\*\*\s*`([0-9a-f]{7,40})`/iu.exec(body)?.[1] ?? null;
}

function cleanReviewedCommit(body = "") {
  if (!/^Codex Review: Didn['’]t find any major issues\./u.test(body)) return null;
  return reviewedCommit(body);
}

function requestedHead(body = "") {
  return (
    /^@codex review\s*\n<!-- lastcode-review-head: ([0-9a-f]{40}) -->\s*$/iu.exec(body)?.[1] ??
    null
  );
}

function handledArtifact(body = "", head) {
  const match =
    /^<!-- lastcode-docs-review-handled: ((?:comment|review):\d+) head: ([0-9a-f]{40}) -->$/iu.exec(
      body,
    );
  return match?.[2] === head ? (match[1] ?? null) : null;
}

function isGenericReviewWrapper(body = "") {
  return (
    body.includes("### 💡 Codex Review") &&
    body.includes("Here are some automated review suggestions for this pull request.")
  );
}

export function latestReviewRequest(comments, head) {
  return (
    comments
      .filter(
        (comment) =>
          comment.user?.login !== CODEX_BOT &&
          TRUSTED_ASSOCIATIONS.has(comment.author_association ?? "") &&
          headMatches(requestedHead(comment.body), head),
      )
      .sort(
        (left, right) =>
          timestamp(right.created_at) - timestamp(left.created_at) || right.id - left.id,
      )[0] ?? null
  );
}

export function deriveReviewState({
  head,
  formalReviews,
  issueComments,
  reviewComments,
  requestReactions,
}) {
  const terminal = [];
  const handled = new Set();

  for (const review of formalReviews) {
    const clean =
      review.state === "APPROVED" || headMatches(cleanReviewedCommit(review.body), head);
    const finding = review.state === "CHANGES_REQUESTED";
    if (
      review.user?.login === CODEX_BOT &&
      review.state !== "PENDING" &&
      headMatches(review.commit_id, head) &&
      (clean || finding || (review.body?.trim() && !isGenericReviewWrapper(review.body)))
    ) {
      const key = `review:${review.id}`;
      terminal.push({ key, observedAt: review.submitted_at ?? "" });
      if (clean) handled.add(key);
    }
  }

  for (const comment of reviewComments) {
    if (comment.user?.login === CODEX_BOT && headMatches(comment.commit_id, head)) {
      const key = `review-comment:${comment.id}`;
      terminal.push({ key, observedAt: comment.created_at ?? "" });
      handled.add(key);
    }
  }

  for (const comment of issueComments) {
    if (comment.user?.login !== CODEX_BOT) continue;
    const commit = reviewedCommit(comment.body);
    if (!headMatches(commit, head)) continue;
    const key = `comment:${comment.id}`;
    terminal.push({ key, observedAt: comment.created_at ?? "" });
    if (headMatches(cleanReviewedCommit(comment.body), head)) handled.add(key);
  }

  const request = latestReviewRequest(issueComments, head);
  const reactions = request
    ? requestReactions.filter((reaction) => reaction.user?.login === CODEX_BOT)
    : [];
  for (const reaction of reactions) {
    if (reaction.content !== "+1") continue;
    const key = `reaction:${reaction.id}`;
    terminal.push({ key, observedAt: reaction.created_at ?? "" });
    handled.add(key);
  }

  const terminalKeys = new Set(terminal.map(({ key }) => key));
  for (const comment of issueComments) {
    if (!TRUSTED_ASSOCIATIONS.has(comment.author_association ?? "")) continue;
    const key = handledArtifact(comment.body, head);
    if (key && terminalKeys.has(key)) handled.add(key);
  }

  const newestReaction = (content) =>
    reactions
      .filter((reaction) => reaction.content === content)
      .sort(
        (left, right) =>
          timestamp(right.created_at) - timestamp(left.created_at) || right.id - left.id,
      )[0] ?? null;
  const cleanReaction = newestReaction("+1");
  const eyesReaction = newestReaction("eyes");
  const cleanReactionWins =
    cleanReaction !== null &&
    (eyesReaction === null ||
      timestamp(cleanReaction.created_at) > timestamp(eyesReaction.created_at) ||
      (timestamp(cleanReaction.created_at) === timestamp(eyesReaction.created_at) &&
        cleanReaction.id >= eyesReaction.id));
  const latestTerminalAt = Math.max(0, ...terminal.map(({ observedAt }) => timestamp(observedAt)));
  const latestPendingAt = Math.max(
    timestamp(request?.created_at),
    ...reactions
      .filter(({ content }) => content === "eyes")
      .map(({ created_at }) => timestamp(created_at)),
  );
  const requestPresent = request !== null || terminal.length > 0;

  return {
    requestPresent,
    pending: requestPresent && !cleanReactionWins && latestTerminalAt <= latestPendingAt,
    ready: terminal.length > 0 && terminal.every(({ key }) => handled.has(key)),
  };
}

export function deriveCheckState(checks) {
  if (checks.length === 0) return "passed";
  const failed = new Set([
    "ACTION_REQUIRED",
    "CANCELLED",
    "ERROR",
    "FAILURE",
    "STALE",
    "STARTUP_FAILURE",
    "TIMED_OUT",
  ]);
  const successful = new Set(["NEUTRAL", "SKIPPED", "SUCCESS"]);
  if (checks.some((check) => failed.has(check.conclusion ?? check.state ?? check.status))) {
    return "failed";
  }
  if (
    checks.every((check) => successful.has(check.conclusion ?? check.state ?? check.status))
  ) {
    return "passed";
  }
  return "pending";
}

export function decide(baseline, current) {
  const pr = current.pullRequest;
  if (!current.local.clean) return { reason: "worktree-changed", wait: false };
  if (current.local.branch !== baseline.local.branch || current.local.head !== baseline.local.head) {
    return { reason: "local-head-changed", wait: false };
  }
  if (pr.number !== baseline.pullRequest.number) return { reason: "pr-changed", wait: false };
  if (pr.state !== "OPEN") return { reason: "pr-closed", wait: false };
  if (pr.isDraft) return { reason: "pr-draft", wait: false };
  if (pr.baseRefName !== BASE_BRANCH) return { reason: "unexpected-base", wait: false };
  if (pr.headRefOid !== baseline.pullRequest.headRefOid) {
    return { reason: "head-changed", wait: false };
  }
  if (pr.baseRefOid !== baseline.pullRequest.baseRefOid) {
    return { reason: "base-changed", wait: false };
  }
  if (
    pr.mergeable === "CONFLICTING" ||
    pr.mergeStateStatus === "BEHIND" ||
    pr.mergeStateStatus === "BLOCKED" ||
    pr.mergeStateStatus === "DIRTY"
  ) {
    return { reason: "merge-blocked", wait: false };
  }
  if (current.checks === "failed") return { reason: "checks-failed", wait: false };
  if (!current.review.requestPresent) return { reason: "review-not-requested", wait: false };
  if (current.unresolvedReviewThreads > 0) {
    return { reason: "review-unresolved", wait: false };
  }
  if (!current.review.pending && !current.review.ready) {
    return { reason: "review-finding", wait: false };
  }
  if (pr.mergeable === "UNKNOWN" || pr.mergeStateStatus === "UNKNOWN") {
    return { reason: "mergeability-pending", wait: true };
  }
  if (current.checks === "passed" && current.review.ready && !current.review.pending) {
    return { reason: "ready", wait: false };
  }
  return {
    reason: current.review.pending ? "review-pending" : "checks-pending",
    wait: true,
  };
}

function localState() {
  return {
    branch: run("git", ["branch", "--show-current"]),
    head: run("git", ["rev-parse", "HEAD"]),
    clean: run("git", ["status", "--porcelain=v1", "--untracked-files=all"]) === "",
  };
}

const reviewThreadsQuery = `query($owner:String!,$name:String!,$number:Int!,$endCursor:String){
  repository(owner:$owner,name:$name){
    pullRequest(number:$number){
      reviewThreads(first:100,after:$endCursor){
        nodes{id isResolved}
        pageInfo{hasNextPage endCursor}
      }
    }
  }
}`;

function readObservation() {
  const local = localState();
  const pullRequest = runJson("gh", [
    "pr",
    "view",
    local.branch,
    "--repo",
    REPOSITORY,
    "--json",
    "number,url,state,isDraft,headRefOid,baseRefOid,baseRefName,mergeable,mergeStateStatus,statusCheckRollup",
  ]);
  const [formalReviews, issueComments, reviewComments] = [
    `repos/${REPOSITORY}/pulls/${pullRequest.number}/reviews?per_page=100`,
    `repos/${REPOSITORY}/issues/${pullRequest.number}/comments?per_page=100`,
    `repos/${REPOSITORY}/pulls/${pullRequest.number}/comments?per_page=100`,
  ].map((endpoint) =>
    flattenPages(
      runJson("gh", ["api", "--paginate", "--slurp", endpoint]),
    ),
  );
  const request = latestReviewRequest(issueComments, pullRequest.headRefOid);
  const requestReactions = request
    ? flattenPages(
        runJson("gh", [
          "api",
          "--paginate",
          "--slurp",
          `repos/${REPOSITORY}/issues/comments/${request.id}/reactions?per_page=100`,
        ]),
      )
    : [];
  const threadPages = runJson("gh", [
    "api",
    "graphql",
    "--paginate",
    "--slurp",
    "-F",
    "owner=lastobelus",
    "-F",
    "name=lastcode-docs",
    "-F",
    `number=${pullRequest.number}`,
    "-f",
    `query=${reviewThreadsQuery}`,
  ]);
  const threads = threadPages.flatMap(
    (page) => page.data?.repository?.pullRequest?.reviewThreads?.nodes ?? [],
  );

  return {
    local,
    pullRequest,
    checks: deriveCheckState(pullRequest.statusCheckRollup ?? []),
    review: deriveReviewState({
      head: pullRequest.headRefOid,
      formalReviews,
      issueComments,
      reviewComments,
      requestReactions,
    }),
    unresolvedReviewThreads: threads.filter(({ isResolved }) => !isResolved).length,
  };
}

function assertStart(observation) {
  if (!observation.local.branch) throw new Error("Wait for PR requires a checked-out branch.");
  if (!observation.local.clean) throw new Error("Wait for PR requires a clean worktree.");
  if (observation.local.head !== observation.pullRequest.headRefOid) {
    throw new Error("The local commit does not match the pull request head.");
  }
  if (observation.pullRequest.baseRefName !== BASE_BRANCH) {
    throw new Error(`The pull request must target ${BASE_BRANCH}.`);
  }
}

export function summary(reason, baseline, current = baseline) {
  return {
    reason,
    pr: baseline.pullRequest.number,
    url: baseline.pullRequest.url,
    head: baseline.pullRequest.headRefOid,
    base: baseline.pullRequest.baseRefOid,
    observed: {
      pr: current.pullRequest.number,
      head: current.pullRequest.headRefOid,
      base: current.pullRequest.baseRefOid,
    },
    checks: current.checks,
    review: current.review.pending
      ? "pending"
      : current.review.ready
        ? "clean"
        : "attention",
    unresolvedReviewThreads: current.unresolvedReviewThreads,
  };
}

const sleep = (duration) => new Promise((resolve) => setTimeout(resolve, duration));

async function main() {
  const baseline = readObservation();
  assertStart(baseline);
  failureBaseline = baseline;
  let current = baseline;
  let previous = "";
  let pendingReason = "";
  let pendingSince = Date.now();

  while (true) {
    let decision = decide(baseline, current);
    if (decision.wait && decision.reason !== pendingReason) {
      pendingReason = decision.reason;
      pendingSince = Date.now();
    }
    if (
      decision.wait &&
      decision.reason === "review-pending" &&
      Date.now() - pendingSince >= REVIEW_TIMEOUT_MS
    ) {
      decision = { reason: "review-timeout", wait: false };
    }
    if (
      decision.wait &&
      decision.reason === "mergeability-pending" &&
      Date.now() - pendingSince >= MERGE_TIMEOUT_MS
    ) {
      decision = { reason: "mergeability-timeout", wait: false };
    }
    if (!decision.wait) {
      console.log(`${SUMMARY_PREFIX}${JSON.stringify(summary(decision.reason, baseline, current))}`);
      return;
    }
    const progress = JSON.stringify(summary(decision.reason, baseline, current));
    if (progress !== previous) {
      console.log(`[lastcode-docs:wait-for-pr] Waiting ${progress}`);
      previous = progress;
    }
    await sleep(POLL_INTERVAL_MS);
    current = readObservation();
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error) => {
    const failure = failureBaseline
      ? summary("command-failed", failureBaseline)
      : { reason: "command-failed" };
    console.error(
      `${SUMMARY_PREFIX}${JSON.stringify({ ...failure, error: String(error.message ?? error) })}`,
    );
    process.exitCode = 1;
  });
}
