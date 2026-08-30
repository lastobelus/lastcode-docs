import type { BrowserRecipe } from "../types.ts";

const THREAD_ID = "annotate-open-questions";

export default {
  id: "thread-annotations",
  async stage({ page }) {
    await page.getByTestId(`thread-row-${THREAD_ID}`).click();
    await page.waitForURL((url) => url.pathname.endsWith(`/${THREAD_ID}`));
    await page
      .getByText("Confirm the minimum supported macOS version before publishing.", { exact: true })
      .first()
      .waitFor();
  },
} satisfies BrowserRecipe;
