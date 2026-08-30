import type { Page } from "playwright";

export type Appearance = "dark" | "light";
export type OutputType = "mp4" | "png" | "poster" | "text" | "webm";

export interface CaptureRecord {
  lastcodeCommit: string;
  recipeHash: string | null;
  fixtureVersion: number;
  contentSha256: string;
  bytes: number;
  width?: number;
  height?: number;
  durationSeconds?: number;
  playwright?: string;
  chromiumRevision?: string;
  manualTool?: { name: string; version: string; licenseCheckedAt: string };
}

export interface MediaOutput {
  id: string;
  type: OutputType;
  appearance: Appearance;
  path: string;
  readmePath?: string;
  alt?: string;
  posterId?: string;
  transcript?: string;
  license: string;
  licenseException?: { reason: string; noticePath: string };
  manualReviewRequired?: boolean;
  record?: CaptureRecord;
}

export interface MediaRecipe {
  id: string;
  kind: "browser" | "manual-cap";
  enabled: boolean;
  sourceFile: string | null;
  appearances: Record<Appearance, boolean>;
  outputs: MediaOutput[];
}

export interface MediaManifest {
  schemaVersion: 1;
  fixtureVersion: number;
  targetCommit: string | null;
  toolchain: {
    playwright: string;
    chromiumRevision: string;
    chromiumVersion: string;
    locale: string;
    viewport: { width: number; height: number };
    reducedMotion: "reduce";
  };
  budgets: {
    pngBytes: number;
    webmBytes: number;
    webmSeconds: number;
    manualMp4Bytes: number;
    manualMp4Seconds: number;
    totalMediaBytes: number;
  };
  recipes: MediaRecipe[];
}

export interface RecipeContext {
  page: Page;
  appearance: Appearance;
  projectId: string;
  threadIds: readonly string[];
}

export interface BrowserRecipe {
  id: string;
  stage(context: RecipeContext): Promise<void>;
  record?(context: RecipeContext): Promise<void>;
  captureText?(context: RecipeContext): Promise<string>;
}
