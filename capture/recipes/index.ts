import codexThreadTools from "./codex-thread-tools.ts";
import resumableActions from "./resumable-actions.ts";
import threadAnnotations from "./thread-annotations.ts";
import workspaceOverview from "./workspace-overview.ts";
import type { BrowserRecipe } from "../types.ts";

export const browserRecipes = new Map<string, BrowserRecipe>(
  [resumableActions, codexThreadTools, threadAnnotations, workspaceOverview].map((recipe) => [
    recipe.id,
    recipe,
  ]),
);
