import type { BrowserRecipe } from "../types.ts";

const THREAD_ID = "document-resumable-actions";
const THREAD_TITLE = "Document resumable project actions";

export default {
  id: "workspace-overview",
  async stage({ page }) {
    await page.getByText(THREAD_TITLE, { exact: true }).click();
    await page.waitForURL((url) => url.pathname.endsWith(`/${THREAD_ID}`));
    const providerError = page.getByRole("button", { name: "Dismiss Codex provider error" });
    if (await providerError.isVisible()) await providerError.click();
    const updateNotice = page.getByRole("button", { name: "Dismiss notification" });
    if (await updateNotice.isVisible()) await updateNotice.click();
    await page.getByText("Preview documentation", { exact: true }).first().waitFor();
    await page
      .getByText("Keep the polling-tax explanation concrete and show the cancellation path.", {
        exact: true,
      })
      .first()
      .waitFor();
    await page.getByText("Preview documentation", { exact: true }).first().click();
    await page.getByTestId(`sidebar-terminal-status-${THREAD_ID}`).waitFor();
    await page.getByRole("textbox", { name: "Terminal input" }).waitFor();
  },
} satisfies BrowserRecipe;
