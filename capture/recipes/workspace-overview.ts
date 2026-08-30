import type { BrowserRecipe } from "../types.ts";

const THREAD_ID = "document-resumable-actions";

export default {
  id: "workspace-overview",
  async stage({ page }) {
    await page.getByTestId(`thread-row-${THREAD_ID}`).click();
    await page.waitForURL((url) => url.pathname.endsWith(`/${THREAD_ID}`));
    await page.getByText("Preview documentation", { exact: true }).first().waitFor();
    await page
      .getByText("Keep the polling-tax explanation concrete and show the cancellation path.", {
        exact: true,
      })
      .first()
      .waitFor();
  },
} satisfies BrowserRecipe;
