import assert from "node:assert/strict";
import * as NodeFS from "node:fs";
import * as NodeOS from "node:os";
import * as NodePath from "node:path";
import test from "node:test";

import {
  pngDimensions,
  readMediaManifest,
  sha256File,
  validateMediaManifest,
  validateMediaManifestPlan,
} from "../capture/manifest.ts";
import type { MediaManifest } from "../capture/types.ts";
import { joinFeatureEvidence } from "../docs/.vitepress/data/featureEvidence.ts";
import { parseCaptureArgs } from "./capture.ts";

const REPOSITORY_ROOT = NodePath.resolve(import.meta.dirname, "..");

function cloneManifest(): MediaManifest {
  return structuredClone(readMediaManifest(REPOSITORY_ROOT));
}

test("the checked-in media plan and disabled manifest are valid", () => {
  validateMediaManifestPlan(REPOSITORY_ROOT);
  validateMediaManifest(REPOSITORY_ROOT);
});

test("enabled recipes require dark output and one target commit", () => {
  const manifest = cloneManifest();
  const recipe = manifest.recipes[0]!;
  recipe.enabled = true;
  recipe.appearances.dark = false;
  assert.throws(
    () => validateMediaManifestPlan(REPOSITORY_ROOT, manifest),
    /must require dark Ocean output/u,
  );

  recipe.appearances.dark = true;
  assert.throws(
    () => validateMediaManifestPlan(REPOSITORY_ROOT, manifest),
    /full target LastCode commit/u,
  );
});

test("light output is required only when a recipe enables light", () => {
  const manifest = cloneManifest();
  const recipe = manifest.recipes[0]!;
  recipe.enabled = true;
  recipe.appearances.light = true;
  manifest.targetCommit = "a".repeat(40);
  assert.throws(
    () => validateMediaManifest(REPOSITORY_ROOT, manifest),
    /has no light output/u,
  );
});

test("movies require a same-appearance poster and transcript", () => {
  const manifest = cloneManifest();
  const movie = manifest.recipes[0]!.outputs.find(({ type }) => type === "webm")!;
  movie.transcript = "";
  assert.throws(
    () => validateMediaManifestPlan(REPOSITORY_ROOT, manifest),
    /needs a transcript/u,
  );

  movie.transcript = "A short sequence.";
  movie.appearance = "light";
  assert.throws(
    () => validateMediaManifestPlan(REPOSITORY_ROOT, manifest),
    /same-recipe poster/u,
  );
});

test("a movie cannot borrow a poster from a disabled recipe", () => {
  const manifest = cloneManifest();
  const sourceRecipe = manifest.recipes[0]!;
  const posterIndex = sourceRecipe.outputs.findIndex(({ type }) => type === "poster");
  const [poster] = sourceRecipe.outputs.splice(posterIndex, 1);
  manifest.recipes[1]!.outputs.push(poster!);
  assert.throws(
    () => validateMediaManifestPlan(REPOSITORY_ROOT, manifest),
    /same-recipe poster/u,
  );
});

test("PNG metadata and hashes come from committed bytes", () => {
  const directory = NodeFS.mkdtempSync(NodePath.join(NodeOS.tmpdir(), "capture-test-"));
  try {
    const path = NodePath.join(directory, "still.png");
    const bytes = Buffer.from(
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=",
      "base64",
    );
    NodeFS.writeFileSync(path, bytes);
    assert.deepEqual(pngDimensions(path), { width: 1, height: 1 });
    assert.match(sha256File(path), /^[0-9a-f]{64}$/u);

    NodeFS.writeFileSync(path, bytes.subarray(0, bytes.length - 8));
    assert.throws(() => pngDimensions(path), /truncated|incomplete/u);
  } finally {
    NodeFS.rmSync(directory, { recursive: true, force: true });
  }
});

test("capture arguments bind an explicit checkout, commit, recipe, and appearance", () => {
  assert.deepEqual(parseCaptureArgs(["--validate"]), { mode: "validate" });
  assert.deepEqual(
    parseCaptureArgs([
      "--lastcode-root",
      "/tmp/lastcode",
      "--commit",
      "a".repeat(40),
      "--recipe",
      "resumable-actions",
      "--appearance",
      "dark",
    ]),
    {
      mode: "capture",
      lastcodeRoot: "/tmp/lastcode",
      commit: "a".repeat(40),
      recipeId: "resumable-actions",
      appearance: "dark",
    },
  );
  assert.throws(
    () => parseCaptureArgs(["--commit", "short"]),
    /requires --lastcode-root/u,
  );
});

test("evidence joins exactly to registry clients and capture IDs", () => {
  const commit = "b".repeat(40);
  const registry = {
    features: [
      {
        id: "example",
        supportedClients: ["web" as const],
        captureRecipeIds: ["example-capture"],
      },
    ],
  };
  const evidence = {
    schemaVersion: 1,
    registryCommit: commit,
    features: {
      example: {
        clients: {
          web: {
            pageCoverage: "stub" as const,
            verificationMethod: "not-verified" as const,
            checkedCommit: commit,
            captureIds: ["example-capture"],
          },
        },
      },
    },
  };
  assert.equal(joinFeatureEvidence(registry, evidence, commit)[0]?.id, "example");
  evidence.features.example.clients.web.captureIds = ["unknown"];
  assert.throws(
    () => joinFeatureEvidence(registry, evidence, commit),
    /unknown capture ID/u,
  );
});
