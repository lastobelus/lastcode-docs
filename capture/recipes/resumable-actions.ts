import type { BrowserRecipe } from "../types.ts";

const THREAD_ID = "document-resumable-actions";
const THREAD_TITLE = "Document resumable project actions";

async function dismissFixtureNotices(page: import("playwright").Page) {
  const providerError = page.getByRole("button", { name: "Dismiss Codex provider error" });
  if (await providerError.isVisible()) await providerError.click();
  const updateNotice = page.getByRole("button", { name: "Dismiss notification" });
  if (await updateNotice.isVisible()) await updateNotice.click();
}

async function closeRunningAction(page: import("playwright").Page) {
  await page.getByRole("button", { name: /^Close Terminal/u }).click();
  const confirm = page.getByRole("button", { name: "Confirm", exact: true });
  if (await confirm.isVisible()) await confirm.click();
  await page.getByTestId(`sidebar-terminal-status-${THREAD_ID}`).waitFor({ state: "hidden" });
}

export default {
  id: "resumable-actions",
  async stage({ page }) {
    await page.getByText(THREAD_TITLE, { exact: true }).click();
    await page.waitForURL((url) => url.pathname.endsWith(`/${THREAD_ID}`));
    await dismissFixtureNotices(page);
    await page.getByText("Preview documentation", { exact: true }).first().waitFor();
    await page.getByText("Preview documentation", { exact: true }).first().click();
    await page.getByTestId(`sidebar-terminal-status-${THREAD_ID}`).waitFor();
    await page.getByRole("textbox", { name: "Terminal input" }).waitFor();
  },
  async prepareRecording({ page }) {
    await closeRunningAction(page);
  },
  async record({ page }) {
    await page.getByText("Preview documentation", { exact: true }).first().click();
    await page.getByTestId(`sidebar-terminal-status-${THREAD_ID}`).waitFor();
    await page.screencast.showOverlay(
      '<div style="position:absolute;right:24px;bottom:24px;padding:10px 14px;border-radius:10px;background:rgba(12,24,38,.88);color:white;font:600 14px -apple-system,BlinkMacSystemFont,sans-serif">The thread is idle while the Action runs.</div>',
      { duration: 1200 },
    );
    await closeRunningAction(page);
    await page.screencast.showOverlay(
      '<div style="position:absolute;right:24px;bottom:24px;padding:10px 14px;border-radius:10px;background:rgba(12,24,38,.88);color:white;font:600 14px -apple-system,BlinkMacSystemFont,sans-serif">The Action is cancelled.</div>',
      { duration: 900 },
    );
  },
} satisfies BrowserRecipe;
