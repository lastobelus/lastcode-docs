import type { BrowserRecipe } from "../types.ts";

const THREAD_ID = "document-resumable-actions";

export default {
  id: "resumable-actions",
  async stage({ page }) {
    await page.getByTestId(`thread-row-${THREAD_ID}`).click();
    await page.waitForURL((url) => url.pathname.endsWith(`/${THREAD_ID}`));
    await page.getByText("Preview documentation", { exact: true }).first().waitFor();
  },
} satisfies BrowserRecipe;
