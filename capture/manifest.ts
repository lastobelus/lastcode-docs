import * as NodeCrypto from "node:crypto";
import * as NodeFS from "node:fs";
import * as NodePath from "node:path";

import type { MediaManifest, MediaOutput, MediaRecipe } from "./types.ts";

export const MEDIA_MANIFEST_PATH = "capture/media.json";

export function readMediaManifest(root: string): MediaManifest {
  return JSON.parse(
    NodeFS.readFileSync(NodePath.join(root, MEDIA_MANIFEST_PATH), "utf8"),
  ) as MediaManifest;
}

export function writeMediaManifest(root: string, manifest: MediaManifest): void {
  NodeFS.writeFileSync(
    NodePath.join(root, MEDIA_MANIFEST_PATH),
    `${JSON.stringify(manifest, null, 2)}\n`,
  );
}

export function sha256File(path: string): string {
  return NodeCrypto.createHash("sha256").update(NodeFS.readFileSync(path)).digest("hex");
}

export function pngDimensions(path: string): { width: number; height: number } {
  const bytes = NodeFS.readFileSync(path);
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  if (bytes.length < 45 || !bytes.subarray(0, 8).equals(signature)) {
    throw new Error(`${path} is not a decodable PNG.`);
  }
  let offset = 8;
  let dimensions: { width: number; height: number } | undefined;
  let hasImageData = false;
  let complete = false;
  while (offset < bytes.length) {
    if (offset + 12 > bytes.length) throw new Error(`${path} has a truncated PNG chunk.`);
    const length = bytes.readUInt32BE(offset);
    const chunkEnd = offset + 12 + length;
    if (chunkEnd > bytes.length) throw new Error(`${path} has a truncated PNG chunk.`);
    const type = bytes.subarray(offset + 4, offset + 8).toString("ascii");
    const expectedCrc = bytes.readUInt32BE(offset + 8 + length);
    let crc = 0xffff_ffff;
    for (const byte of bytes.subarray(offset + 4, offset + 8 + length)) {
      crc ^= byte;
      for (let bit = 0; bit < 8; bit += 1) {
        crc = (crc >>> 1) ^ ((crc & 1) === 1 ? 0xedb8_8320 : 0);
      }
    }
    if (((crc ^ 0xffff_ffff) >>> 0) !== expectedCrc) {
      throw new Error(`${path} has a corrupt ${type} PNG chunk.`);
    }
    if (type === "IHDR") {
      if (offset !== 8 || length !== 13 || dimensions) {
        throw new Error(`${path} has an invalid PNG header.`);
      }
      const width = bytes.readUInt32BE(offset + 8);
      const height = bytes.readUInt32BE(offset + 12);
      if (width === 0 || height === 0) throw new Error(`${path} has invalid PNG dimensions.`);
      dimensions = { width, height };
    } else if (type === "IDAT") {
      hasImageData = true;
    } else if (type === "IEND") {
      if (length !== 0 || chunkEnd !== bytes.length) {
        throw new Error(`${path} has an invalid PNG ending.`);
      }
      complete = true;
    }
    offset = chunkEnd;
  }
  if (!dimensions || !hasImageData || !complete) {
    throw new Error(`${path} is an incomplete PNG.`);
  }
  return dimensions;
}

function enabledOutputs(recipe: MediaRecipe): MediaOutput[] {
  return recipe.outputs.filter(({ appearance }) => recipe.appearances[appearance]);
}

function isStableMediaPath(path: string): boolean {
  return (
    path.startsWith("docs/public/media/") &&
    NodePath.posix.normalize(path) === path &&
    !NodePath.posix.isAbsolute(path) &&
    !path.split("/").includes("..")
  );
}

function validateOutputPlan(root: string, output: MediaOutput, outputIds: Set<string>): void {
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/u.test(output.id)) {
    throw new Error(`Output ${output.id} needs a stable kebab-case ID.`);
  }
  if (!isStableMediaPath(output.path)) {
    throw new Error(`Output ${output.id} must use a stable docs/public/media path.`);
  }
  if ((output.type === "png" || output.type === "poster") && !output.alt?.trim()) {
    throw new Error(`Output ${output.id} needs alt text.`);
  }
  if (output.type === "webm" || output.type === "mp4") {
    if (!output.posterId || !outputIds.has(output.posterId)) {
      throw new Error(`Output ${output.id} needs a registered poster.`);
    }
    if (!output.transcript?.trim()) throw new Error(`Output ${output.id} needs a transcript.`);
  }
  if (
    output.readmePath &&
    (!isStableMediaPath(output.readmePath) ||
      !output.readmePath.startsWith("docs/public/media/readme/"))
  ) {
    throw new Error(`README output ${output.id} must use docs/public/media/readme/.`);
  }
  if (output.license !== "CC-BY-4.0" && !output.licenseException) {
    throw new Error(`Output ${output.id} needs a license exception.`);
  }
  if (
    output.licenseException &&
    (!output.licenseException.reason.trim() || !output.licenseException.noticePath.trim())
  ) {
    throw new Error(`Output ${output.id} has an incomplete license exception.`);
  }
  if (
    output.licenseException &&
    !NodeFS.existsSync(NodePath.join(root, output.licenseException.noticePath))
  ) {
    throw new Error(`Output ${output.id} names a missing license notice.`);
  }
  if (output.type === "mp4" && !output.manualReviewRequired) {
    throw new Error(`Manual movie ${output.id} must require human review.`);
  }
}

function validateRecordedOutput(
  root: string,
  manifest: MediaManifest,
  recipe: MediaRecipe,
  output: MediaOutput,
): number {
  const path = NodePath.join(root, output.path);
  if (!NodeFS.existsSync(path)) throw new Error(`Missing required output ${output.path}.`);
  if (!output.record) throw new Error(`Output ${output.id} has no capture record.`);
  const bytes = NodeFS.statSync(path).size;
  if (bytes !== output.record.bytes) throw new Error(`Output ${output.id} has a stale byte count.`);
  if (sha256File(path) !== output.record.contentSha256) {
    throw new Error(`Output ${output.id} has a stale content hash.`);
  }
  if (output.record.lastcodeCommit !== manifest.targetCommit) {
    throw new Error(`Output ${output.id} does not cover the target LastCode commit.`);
  }
  if (output.record.fixtureVersion !== manifest.fixtureVersion) {
    throw new Error(`Output ${output.id} uses a stale fixture version.`);
  }

  if (recipe.kind === "browser") {
    if (output.record.playwright !== manifest.toolchain.playwright) {
      throw new Error(`Output ${output.id} uses a stale Playwright version.`);
    }
    if (output.record.chromiumRevision !== manifest.toolchain.chromiumRevision) {
      throw new Error(`Output ${output.id} uses a stale Chromium revision.`);
    }
    const sourcePath = NodePath.join(root, recipe.sourceFile as string);
    if (output.record.recipeHash !== sha256File(sourcePath)) {
      throw new Error(`Output ${output.id} uses a stale recipe hash.`);
    }
  } else if (!output.record.manualTool) {
    throw new Error(`Manual output ${output.id} has no capture-tool record.`);
  }

  if (output.type === "png" || output.type === "poster") {
    const dimensions = pngDimensions(path);
    if (dimensions.width !== output.record.width || dimensions.height !== output.record.height) {
      throw new Error(`Output ${output.id} has stale dimensions.`);
    }
    if (bytes > manifest.budgets.pngBytes) throw new Error(`Output ${output.id} exceeds its budget.`);
  }
  if (output.type === "webm" || output.type === "mp4") {
    const duration = output.record.durationSeconds ?? 0;
    if (!Number.isFinite(duration) || duration <= 0) {
      throw new Error(`Output ${output.id} has no valid recorded duration.`);
    }
    const byteBudget =
      output.type === "webm" ? manifest.budgets.webmBytes : manifest.budgets.manualMp4Bytes;
    const durationBudget =
      output.type === "webm" ? manifest.budgets.webmSeconds : manifest.budgets.manualMp4Seconds;
    if (bytes > byteBudget || duration > durationBudget) {
      throw new Error(`Output ${output.id} exceeds its media budget.`);
    }
  }
  if (output.readmePath) {
    const readmePath = NodePath.join(root, output.readmePath);
    if (!NodeFS.existsSync(readmePath) || sha256File(readmePath) !== output.record.contentSha256) {
      throw new Error(`README output ${output.id} is missing or stale.`);
    }
  }
  return bytes;
}

export function validateMediaManifestPlan(root: string, manifest = readMediaManifest(root)): void {
  if (manifest.schemaVersion !== 1) throw new Error("Unsupported media manifest version.");
  const recipeIds = new Set<string>();
  const outputIds = new Set<string>();
  for (const recipe of manifest.recipes) {
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/u.test(recipe.id)) {
      throw new Error(`Recipe ${recipe.id} needs a stable kebab-case ID.`);
    }
    if (recipeIds.has(recipe.id)) throw new Error(`Duplicate recipe ID ${recipe.id}.`);
    recipeIds.add(recipe.id);
    if (recipe.kind === "browser" && !recipe.sourceFile) {
      throw new Error(`Browser recipe ${recipe.id} needs a source file.`);
    }
    if (
      recipe.kind === "browser" &&
      (!recipe.sourceFile?.startsWith("capture/recipes/") ||
        NodePath.posix.normalize(recipe.sourceFile) !== recipe.sourceFile ||
        recipe.sourceFile.split("/").includes(".."))
    ) {
      throw new Error(`Browser recipe ${recipe.id} needs a stable recipe source path.`);
    }
    if (
      recipe.kind === "browser" &&
      !NodeFS.existsSync(NodePath.join(root, recipe.sourceFile as string))
    ) {
      throw new Error(`Browser recipe ${recipe.id} names a missing source file.`);
    }
    if (recipe.enabled && !recipe.appearances.dark) {
      throw new Error(`Enabled recipe ${recipe.id} must require dark Ocean output.`);
    }
    for (const output of recipe.outputs) {
      if (outputIds.has(output.id)) throw new Error(`Duplicate output ID ${output.id}.`);
      outputIds.add(output.id);
    }
  }
  for (const recipe of manifest.recipes) {
    for (const output of recipe.outputs) validateOutputPlan(root, output, outputIds);
  }
  const outputsById = new Map(
    manifest.recipes.flatMap(({ outputs }) => outputs.map((output) => [output.id, output] as const)),
  );
  for (const output of outputsById.values()) {
    if (output.type !== "webm" && output.type !== "mp4") continue;
    const poster = outputsById.get(output.posterId as string);
    if (poster?.type !== "poster" || poster.appearance !== output.appearance) {
      throw new Error(`Output ${output.id} needs a poster for the same appearance.`);
    }
  }

  const registeredPaths = new Set(
    manifest.recipes.flatMap(({ outputs }) =>
      outputs.flatMap((output) => [output.path, ...(output.readmePath ? [output.readmePath] : [])]),
    ),
  );
  const mediaRoot = NodePath.join(root, "docs/public/media");
  if (NodeFS.existsSync(mediaRoot)) {
    const pending = [mediaRoot];
    while (pending.length > 0) {
      const directory = pending.pop() as string;
      for (const entry of NodeFS.readdirSync(directory, { withFileTypes: true })) {
        const path = NodePath.join(directory, entry.name);
        if (entry.isDirectory()) pending.push(path);
        else {
          const relativePath = NodePath.relative(root, path).split(NodePath.sep).join("/");
          if (!registeredPaths.has(relativePath)) {
            throw new Error(`Unregistered media file ${relativePath}.`);
          }
        }
      }
    }
  }

  const anyEnabled = manifest.recipes.some(({ enabled }) => enabled);
  if (anyEnabled && !/^[0-9a-f]{40}$/u.test(manifest.targetCommit ?? "")) {
    throw new Error("Enabled recipes require one full target LastCode commit.");
  }
}

export function validateMediaManifest(root: string, manifest = readMediaManifest(root)): void {
  validateMediaManifestPlan(root, manifest);

  let totalBytes = 0;
  for (const recipe of manifest.recipes.filter(({ enabled }) => enabled)) {
    const outputs = enabledOutputs(recipe);
    for (const appearance of ["dark", "light"] as const) {
      if (!recipe.appearances[appearance]) continue;
      if (!outputs.some((output) => output.appearance === appearance)) {
        throw new Error(`Recipe ${recipe.id} has no ${appearance} output.`);
      }
    }
    for (const output of outputs) {
      validateRecordedOutput(root, manifest, recipe, output);
    }
  }
  const mediaRoot = NodePath.join(root, "docs/public/media");
  if (NodeFS.existsSync(mediaRoot)) {
    const pending = [mediaRoot];
    while (pending.length > 0) {
      const directory = pending.pop() as string;
      for (const entry of NodeFS.readdirSync(directory, { withFileTypes: true })) {
        const path = NodePath.join(directory, entry.name);
        if (entry.isDirectory()) pending.push(path);
        else totalBytes += NodeFS.statSync(path).size;
      }
    }
  }
  if (totalBytes > manifest.budgets.totalMediaBytes) {
    throw new Error("Committed media exceeds the total budget.");
  }
}
