import type { BrowserRecipe } from "../types.ts";

const THREAD_ID = "annotate-open-questions";
const THREAD_TITLE = "Annotate open documentation questions";
const INITIAL_ANNOTATION = "Confirm the minimum supported macOS version before publishing.";
const EDITED_ANNOTATION = "Confirm Apple Silicon macOS support before publishing.";

export default {
  id: "thread-annotations",
  async stage({ page }) {
    await page.getByText(THREAD_TITLE, { exact: true }).click();
    await page.waitForURL((url) => url.pathname.endsWith(`/${THREAD_ID}`));
    const providerError = page.getByRole("button", { name: "Dismiss Codex provider error" });
    if (await providerError.isVisible()) await providerError.click();
    const updateNotice = page.getByRole("button", { name: "Dismiss notification" });
    if (await updateNotice.isVisible()) await updateNotice.click();
    await page.getByText(INITIAL_ANNOTATION, { exact: true }).first().waitFor();
  },
  async record({ page }) {
    await page.getByRole("button", { name: "Edit", exact: true }).last().click();
    await page.getByRole("textbox", { name: "Thread annotation" }).fill(EDITED_ANNOTATION);
    await page.getByRole("button", { name: "Save", exact: true }).click();
    await page.getByText(EDITED_ANNOTATION, { exact: true }).first().waitFor();
    await page.getByRole("button", { name: "Resolve", exact: true }).last().click();
    await page.getByRole("button", { name: "Thread annotation", exact: true }).click();
    await page.getByRole("button", { name: "Reopen", exact: true }).first().waitFor();
    await page.getByRole("button", { name: "Reopen", exact: true }).first().click();
    await page.getByRole("button", { name: "Resolve", exact: true }).last().waitFor();
    await page.screencast.showOverlay(
      '<div style="position:absolute;right:24px;bottom:24px;padding:10px 14px;border-radius:10px;background:rgba(12,24,38,.88);color:white;font:600 14px -apple-system,BlinkMacSystemFont,sans-serif">The annotation is open again.</div>',
      { duration: 900 },
    );
  },
} satisfies BrowserRecipe;
