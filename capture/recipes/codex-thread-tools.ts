import type { BrowserRecipe } from "../types.ts";

const THREAD_ID = "coordinate-thread-tools";
const THREAD_TITLE = "Coordinate work across threads";

export default {
  id: "codex-thread-tools",
  async stage({ page }) {
    await page.getByText(THREAD_TITLE, { exact: true }).click();
    await page.waitForURL((url) => url.pathname.endsWith(`/${THREAD_ID}`));
    const providerError = page.getByRole("button", { name: "Dismiss Codex provider error" });
    if (await providerError.isVisible()) await providerError.click();
    const updateNotice = page.getByRole("button", { name: "Dismiss notification" });
    if (await updateNotice.isVisible()) await updateNotice.click();
    await page
      .getByText(
        "The example lists the available threads, reads a bounded slice of context, and sends one tracked follow-up.",
        { exact: true },
      )
      .waitFor();
  },
  async captureText() {
    return [
      "Listed the synthetic documentation threads.",
      "Read bounded context from Annotate open documentation questions.",
      "Sent one tracked follow-up to Publish the feature index.",
      "",
    ].join("\n");
  },
} satisfies BrowserRecipe;
