#!/usr/bin/env node

import * as NodeChildProcess from "node:child_process";
import * as NodeFS from "node:fs";
import * as NodeFSP from "node:fs/promises";
import * as NodeOS from "node:os";
import * as NodePath from "node:path";
import * as NodeProcess from "node:process";
import { once } from "node:events";

import { chromium, type BrowserContext, type Page } from "playwright";

import {
  pngDimensions,
  readMediaManifest,
  sha256File,
  validateMediaManifest,
  validateMediaManifestPlan,
  writeMediaManifest,
} from "../capture/manifest.ts";
import { browserRecipes } from "../capture/recipes/index.ts";
import type {
  Appearance,
  CaptureRecord,
  MediaManifest,
  MediaOutput,
  MediaRecipe,
} from "../capture/types.ts";

const REPOSITORY_ROOT = NodePath.resolve(import.meta.dirname, "..");
const READY_PREFIX = "LASTCODE_DOCS_FIXTURE_READY=";
const STARTUP_TIMEOUT_MS = 90_000;

interface CaptureOptions {
  mode: "capture";
  lastcodeRoot: string;
  commit: string;
  recipeId: string;
  appearance: Appearance;
}

interface ValidateOptions {
  mode: "validate";
}

interface FixtureMetadata {
  schemaVersion: number;
  sourceCommit: string;
  pairingUrl: string;
  projectId: string;
  primaryThreadId: string;
  threadIds: string[];
}

interface OwnedFixture {
  child: NodeChildProcess.ChildProcess;
  ready: Promise<FixtureMetadata>;
}

export function parseCaptureArgs(argv: readonly string[]): CaptureOptions | ValidateOptions {
  if (argv.length === 1 && argv[0] === "--validate") return { mode: "validate" };

  const values = new Map<string, string>();
  for (let index = 0; index < argv.length; index += 2) {
    const flag = argv[index];
    const value = argv[index + 1];
    if (!flag?.startsWith("--") || value === undefined) {
      throw new Error(`Missing value for ${flag ?? "argument"}.`);
    }
    if (values.has(flag)) throw new Error(`Duplicate argument ${flag}.`);
    values.set(flag, value);
  }
  const allowed = new Set(["--lastcode-root", "--commit", "--recipe", "--appearance"]);
  for (const flag of values.keys()) {
    if (!allowed.has(flag)) throw new Error(`Unknown argument ${flag}.`);
  }
  const lastcodeRoot = values.get("--lastcode-root");
  const commit = values.get("--commit");
  const recipeId = values.get("--recipe");
  const appearance = values.get("--appearance");
  if (!lastcodeRoot || !commit || !recipeId || !appearance) {
    throw new Error(
      "Capture requires --lastcode-root, --commit, --recipe, and --appearance.",
    );
  }
  if (!/^[0-9a-f]{40}$/u.test(commit)) throw new Error("--commit must be one full Git commit.");
  if (appearance !== "dark" && appearance !== "light") {
    throw new Error("--appearance must be dark or light.");
  }
  return {
    mode: "capture",
    lastcodeRoot: NodePath.resolve(lastcodeRoot),
    commit,
    recipeId,
    appearance,
  };
}

function redactFixtureCredentials(value: string): string {
  return value.replace(/([#&?]token=)[^\s&"'}]+/giu, "$1[redacted]");
}

function startFixture(lastcodeRoot: string, commit: string, outputDirectory: string): OwnedFixture {
  const child = NodeChildProcess.spawn(
    "pnpm",
    ["lastcode:docs:fixtures", "--commit", commit, "--output", outputDirectory],
    {
      cwd: lastcodeRoot,
      detached: NodeProcess.platform !== "win32",
      env: { ...NodeProcess.env, NO_COLOR: "1", FORCE_COLOR: "0" },
      stdio: ["ignore", "pipe", "pipe"],
    },
  );
  let outputTail = "";
  let pendingStdout = "";
  const ready = new Promise<FixtureMetadata>((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(
        new Error(
          `LastCode's documentation fixture did not become ready. ${redactFixtureCredentials(outputTail)}`,
        ),
      );
    }, STARTUP_TIMEOUT_MS);
    const finish = (result: { value?: FixtureMetadata; error?: Error }) => {
      clearTimeout(timeout);
      child.removeListener("error", onError);
      child.removeListener("close", onClose);
      if (result.error) reject(result.error);
      else resolve(result.value as FixtureMetadata);
    };
    const inspectStdout = (chunk: string) => {
      outputTail = `${outputTail}${chunk}`.slice(-32_000);
      pendingStdout += chunk;
      const lines = pendingStdout.split(/\r?\n/u);
      pendingStdout = lines.pop() ?? "";
      for (const line of lines) {
        if (!line.startsWith(READY_PREFIX)) continue;
        try {
          finish({ value: JSON.parse(line.slice(READY_PREFIX.length)) as FixtureMetadata });
        } catch (error) {
          finish({
            error: new Error(
              `LastCode returned invalid fixture metadata: ${error instanceof Error ? error.message : String(error)}`,
            ),
          });
        }
        return;
      }
    };
    const inspectStderr = (chunk: string) => {
      outputTail = `${outputTail}${chunk}`.slice(-32_000);
    };
    const onError = (error: Error) => finish({ error });
    const onClose = (code: number | null, signal: NodeJS.Signals | null) =>
      finish({
        error: new Error(
          `LastCode's documentation fixture exited before readiness (${code ?? signal ?? "unknown"}). ${redactFixtureCredentials(outputTail)}`,
        ),
      });
    child.once("error", onError);
    child.once("close", onClose);
    child.stdout?.setEncoding("utf8");
    child.stderr?.setEncoding("utf8");
    child.stdout?.on("data", inspectStdout);
    child.stderr?.on("data", inspectStderr);
  });
  return { child, ready };
}

async function stopFixture(child: NodeChildProcess.ChildProcess): Promise<void> {
  if (child.exitCode !== null || child.signalCode !== null || child.pid === undefined) return;
  const signal = (name: NodeJS.Signals) => {
    if (child.pid === undefined) return;
    if (NodeProcess.platform === "win32") child.kill(name);
    else NodeProcess.kill(-child.pid, name);
  };
  const closed = once(child, "close");
  signal("SIGTERM");
  const force = setTimeout(() => signal("SIGKILL"), 10_000);
  await closed;
  clearTimeout(force);
}

function plannedOutputs(recipe: MediaRecipe, appearance: Appearance): MediaOutput[] {
  return recipe.outputs.filter((output) => output.appearance === appearance);
}

async function makeDirectoryFor(path: string): Promise<void> {
  await NodeFSP.mkdir(NodePath.dirname(path), { recursive: true });
}

async function preparePage(
  page: Page,
  fixture: FixtureMetadata,
  appearance: Appearance,
): Promise<void> {
  await page.goto(fixture.pairingUrl, { waitUntil: "domcontentloaded" });
  await page.waitForFunction(
    ({ expectedAppearance }) => {
      const root = document.documentElement;
      return (
        root.dataset.themeId === "ocean" &&
        root.classList.contains("dark") === (expectedAppearance === "dark")
      );
    },
    { expectedAppearance: appearance },
  );
  await page.evaluate(async () => document.fonts.ready);
  await page.getByTestId(`thread-row-${fixture.primaryThreadId}`).waitFor();
  await page.addStyleTag({
    content:
      "input, textarea, [contenteditable='true'] { caret-color: transparent !important; }",
  });
}

function createCaptureRecord(
  path: string,
  output: MediaOutput,
  manifest: MediaManifest,
  commit: string,
  recipeHash: string,
  durationSeconds?: number,
): CaptureRecord {
  const record: CaptureRecord = {
    lastcodeCommit: commit,
    recipeHash,
    fixtureVersion: manifest.fixtureVersion,
    contentSha256: sha256File(path),
    bytes: NodeFS.statSync(path).size,
    playwright: manifest.toolchain.playwright,
    chromiumRevision: manifest.toolchain.chromiumRevision,
  };
  if (output.type === "png" || output.type === "poster") {
    const dimensions = pngDimensions(path);
    record.width = dimensions.width;
    record.height = dimensions.height;
  } else if (output.type === "webm") {
    record.durationSeconds = durationSeconds;
  }
  return record;
}

async function materializeOutput(
  temporaryPath: string,
  output: MediaOutput,
  record: CaptureRecord,
): Promise<void> {
  const stablePath = NodePath.join(REPOSITORY_ROOT, output.path);
  await makeDirectoryFor(stablePath);
  await NodeFSP.copyFile(temporaryPath, stablePath);
  if (output.readmePath) {
    const readmePath = NodePath.join(REPOSITORY_ROOT, output.readmePath);
    await makeDirectoryFor(readmePath);
    await NodeFSP.copyFile(temporaryPath, readmePath);
  }
  output.record = record;
}

async function inspectMedia(
  page: Page,
  path: string,
  output: MediaOutput,
): Promise<{ width?: number; height?: number; durationSeconds?: number }> {
  const bytes = NodeFS.readFileSync(path).toString("base64");
  if (output.type === "png" || output.type === "poster") {
    const source = `data:image/png;base64,${bytes}`;
    await page.setContent('<img id="capture-image" alt="">');
    await page.evaluate((imageSource) => {
      const image = document.querySelector<HTMLImageElement>("#capture-image");
      if (!image) throw new Error("Image validator could not create its media element.");
      image.addEventListener(
        "load",
        () => {
          document.body.dataset.mediaState = "ready";
        },
        { once: true },
      );
      image.addEventListener(
        "error",
        () => {
          document.body.dataset.mediaState = "error";
        },
        { once: true },
      );
      image.src = imageSource;
    }, source);
    await page.waitForFunction(() => document.body.dataset.mediaState !== undefined);
    const result = await page.evaluate(() => {
      const image = document.querySelector<HTMLImageElement>("#capture-image");
      return {
        state: document.body.dataset.mediaState,
        width: image?.naturalWidth ?? 0,
        height: image?.naturalHeight ?? 0,
      };
    });
    if (result.state !== "ready" || result.width <= 0 || result.height <= 0) {
      throw new Error(`Chromium could not decode ${output.path}.`);
    }
    return { width: result.width, height: result.height };
  }

  if (output.type !== "webm" && output.type !== "mp4") return {};
  const mimeType = output.type === "webm" ? "video/webm" : "video/mp4";
  const source = `data:${mimeType};base64,${bytes}`;
  await page.setContent('<video id="capture-video" preload="auto"></video>');
  await page.evaluate((videoSource) => {
    const video = document.querySelector<HTMLVideoElement>("#capture-video");
    if (!video) throw new Error("Video validator could not create its media element.");
    video.addEventListener(
      "canplay",
      () => {
        document.body.dataset.mediaState = "ready";
      },
      { once: true },
    );
    video.addEventListener(
      "error",
      () => {
        document.body.dataset.mediaState = "error";
      },
      { once: true },
    );
    video.src = videoSource;
    video.load();
  }, source);
  await page.waitForFunction(() => document.body.dataset.mediaState !== undefined);
  const result = await page.evaluate(() => {
    const video = document.querySelector<HTMLVideoElement>("#capture-video");
    return {
      state: document.body.dataset.mediaState,
      duration: video?.duration ?? Number.NaN,
    };
  });
  if (result.state !== "ready" || !Number.isFinite(result.duration) || result.duration <= 0) {
    throw new Error(`Chromium could not decode ${output.path}.`);
  }
  return { durationSeconds: result.duration };
}

async function captureRecipe(options: CaptureOptions): Promise<void> {
  const manifest = readMediaManifest(REPOSITORY_ROOT);
  manifest.targetCommit = options.commit;
  validateMediaManifestPlan(REPOSITORY_ROOT, manifest);
  await validatePlaywrightPin(manifest);

  const manifestRecipe = manifest.recipes.find(({ id }) => id === options.recipeId);
  if (!manifestRecipe) throw new Error(`Unknown capture recipe ${options.recipeId}.`);
  if (manifestRecipe.kind !== "browser") {
    throw new Error(`${options.recipeId} is a manual Cap recipe and cannot run unattended.`);
  }
  if (!manifestRecipe.enabled) throw new Error(`Capture recipe ${options.recipeId} is disabled.`);
  if (!manifestRecipe.appearances[options.appearance]) {
    throw new Error(`${options.recipeId} does not enable ${options.appearance} output.`);
  }
  const recipe = browserRecipes.get(options.recipeId);
  if (!recipe) throw new Error(`No browser implementation exists for ${options.recipeId}.`);
  const outputs = plannedOutputs(manifestRecipe, options.appearance);
  const videoOutput = outputs.find(({ type }) => type === "webm");
  if (videoOutput && !recipe.record) {
    throw new Error(`${options.recipeId} needs a record() function before its movie can run.`);
  }
  if (outputs.some(({ type }) => type === "text") && !recipe.captureText) {
    throw new Error(`${options.recipeId} needs captureText() before its text output can run.`);
  }

  const temporaryRoot = await NodeFSP.mkdtemp(
    NodePath.join(NodeOS.tmpdir(), "lastcode-docs-capture-"),
  );
  const fixtureDirectory = NodePath.join(temporaryRoot, "fixture");
  await NodeFSP.mkdir(fixtureDirectory);
  const fixtureProcess = startFixture(options.lastcodeRoot, options.commit, fixtureDirectory);
  let context: BrowserContext | undefined;
  let browser: Awaited<ReturnType<typeof chromium.launch>> | undefined;
  try {
    const fixture = await fixtureProcess.ready;
    if (
      fixture.schemaVersion !== manifest.fixtureVersion ||
      fixture.sourceCommit !== options.commit
    ) {
      throw new Error("LastCode fixture metadata does not match this capture request.");
    }
    try {
      browser = await chromium.launch({ headless: true });
    } catch (error) {
      throw new Error(
        `Pinned Chromium is unavailable. Run npm run capture:install. ${error instanceof Error ? error.message : String(error)}`,
      );
    }
    if (browser.version() !== manifest.toolchain.chromiumVersion) {
      throw new Error(
        `Chromium ${browser.version()} does not match ${manifest.toolchain.chromiumVersion}.`,
      );
    }
    context = await browser.newContext({
      viewport: manifest.toolchain.viewport,
      locale: manifest.toolchain.locale,
      colorScheme: options.appearance,
      reducedMotion: manifest.toolchain.reducedMotion,
    });
    await context.addInitScript(({ appearance }) => {
      window.localStorage.setItem("t3code:theme", "ocean");
      window.localStorage.setItem("t3code:theme-follow-system", "false");
      window.localStorage.setItem("t3code:theme-appearance-mode", appearance);
    }, { appearance: options.appearance });
    const page = await context.newPage();
    await preparePage(page, fixture, options.appearance);
    const recipeContext = {
      page,
      appearance: options.appearance,
      projectId: fixture.projectId,
      threadIds: fixture.threadIds,
    } as const;
    await recipe.stage(recipeContext);

    const temporaryOutputs = new Map<string, string>();
    for (const output of outputs) {
      const temporaryPath = NodePath.join(temporaryRoot, "outputs", NodePath.basename(output.path));
      await makeDirectoryFor(temporaryPath);
      if (output.type === "png" || output.type === "poster") {
        await page.screenshot({ path: temporaryPath, animations: "disabled" });
        temporaryOutputs.set(output.id, temporaryPath);
      } else if (output.type === "text") {
        await NodeFSP.writeFile(temporaryPath, await recipe.captureText!(recipeContext), "utf8");
        temporaryOutputs.set(output.id, temporaryPath);
      }
    }
    const durations = new Map<string, number>();
    if (videoOutput) {
      const temporaryPath = NodePath.join(
        temporaryRoot,
        "outputs",
        NodePath.basename(videoOutput.path),
      );
      await makeDirectoryFor(temporaryPath);
      await page.screencast.start({
        path: temporaryPath,
        size: manifest.toolchain.viewport,
      });
      try {
        await recipe.record!(recipeContext);
      } finally {
        await page.screencast.stop();
      }
      temporaryOutputs.set(videoOutput.id, temporaryPath);
      const inspection = await inspectMedia(page, temporaryPath, videoOutput);
      if (inspection.durationSeconds === undefined) {
        throw new Error(`Could not read the duration of ${videoOutput.id}.`);
      }
      durations.set(videoOutput.id, inspection.durationSeconds);
    }
    await context.close();
    context = undefined;

    const recipeHash = sha256File(NodePath.join(REPOSITORY_ROOT, manifestRecipe.sourceFile!));
    for (const output of outputs) {
      const temporaryPath = temporaryOutputs.get(output.id);
      if (!temporaryPath) throw new Error(`No output was produced for ${output.id}.`);
      const record = createCaptureRecord(
        temporaryPath,
        output,
        manifest,
        options.commit,
        recipeHash,
        durations.get(output.id),
      );
      await materializeOutput(temporaryPath, output, record);
    }
    validateMediaManifestPlan(REPOSITORY_ROOT, manifest);
    writeMediaManifest(REPOSITORY_ROOT, manifest);
  } finally {
    if (context) await context.close().catch(() => undefined);
    if (browser) await browser.close().catch(() => undefined);
    await stopFixture(fixtureProcess.child).catch(() => undefined);
    await NodeFSP.rm(temporaryRoot, { recursive: true, force: true });
  }
}

async function validatePlaywrightPin(manifest: MediaManifest): Promise<void> {
  const packageJson = JSON.parse(
    await NodeFSP.readFile(NodePath.join(REPOSITORY_ROOT, "package.json"), "utf8"),
  ) as { devDependencies?: Record<string, string> };
  if (packageJson.devDependencies?.playwright !== manifest.toolchain.playwright) {
    throw new Error("package.json and capture/media.json must pin the same Playwright version.");
  }
}

async function validatePinnedBrowserMedia(manifest: MediaManifest): Promise<void> {
  await validatePlaywrightPin(manifest);
  const media = manifest.recipes
    .filter(({ enabled }) => enabled)
    .flatMap((recipe) =>
      recipe.outputs.filter(
        (output) =>
          recipe.appearances[output.appearance] &&
          output.type !== "text",
      ),
    );
  if (media.length === 0) return;

  let browser: Awaited<ReturnType<typeof chromium.launch>>;
  try {
    browser = await chromium.launch({ headless: true });
  } catch (error) {
    throw new Error(
      `Pinned Chromium is unavailable. Run npm run capture:install. ${error instanceof Error ? error.message : String(error)}`,
    );
  }
  try {
    if (browser.version() !== manifest.toolchain.chromiumVersion) {
      throw new Error(
        `Chromium ${browser.version()} does not match ${manifest.toolchain.chromiumVersion}.`,
      );
    }
    const page = await browser.newPage();
    for (const output of media) {
      const path = NodePath.join(REPOSITORY_ROOT, output.path);
      const result = await inspectMedia(page, path, output);
      if (output.type === "png" || output.type === "poster") {
        if (
          result.width !== output.record?.width ||
          result.height !== output.record?.height
        ) {
          throw new Error(`Output ${output.id} has stale dimensions.`);
        }
      } else if (
        Math.abs((result.durationSeconds ?? 0) - (output.record?.durationSeconds ?? 0)) > 0.05
      ) {
        throw new Error(`Output ${output.id} has a stale duration.`);
      }
    }
  } finally {
    await browser.close();
  }
}

export async function runCaptureCli(
  argv = NodeProcess.argv.slice(2),
): Promise<void> {
  const options = parseCaptureArgs(argv);
  if (options.mode === "validate") {
    const manifest = readMediaManifest(REPOSITORY_ROOT);
    validateMediaManifest(REPOSITORY_ROOT, manifest);
    await validatePinnedBrowserMedia(manifest);
    NodeProcess.stdout.write("Capture manifest is valid.\n");
    return;
  }
  await captureRecipe(options);
  NodeProcess.stdout.write(
    `Captured ${options.recipeId} (${options.appearance}) at ${options.commit}.\n`,
  );
}

if (import.meta.main) {
  runCaptureCli().catch((error) => {
    NodeProcess.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
    process.exitCode = 1;
  });
}
