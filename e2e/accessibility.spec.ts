import AxeBuilder from "@axe-core/playwright";
import type { Page } from "@playwright/test";
import Theme from "@/domain/theme";
import { expect, SERVER_UUID, test } from "./fixtures";

// WCAG 2.2 AA, plus axe's best practices (landmarks, headings...).
const AXE_TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa", "best-practice"];
// Bootstrap fades panels in: axe would measure the contrast of half-transparent text.
const TRANSITION_MS = 600;

async function expectNoAccessibilityViolations(page: Page) {
  await page.waitForTimeout(TRANSITION_MS);
  const { violations } = await new AxeBuilder({ page }).withTags(AXE_TAGS).analyze();
  // One line per violation, so that a failure tells what to fix and where.
  expect(violations.map((violation) => `${violation.id}: ${violation.help} (${violation.nodes.map((node) => node.target.join(" ")).join(", ")})`)).toEqual([]);
}

for (const theme of [Theme.Light, Theme.Dark]) {
  test.describe(`accessibility with the ${theme} theme`, () => {
    test.beforeEach(async ({ extension, aria2 }) => {
      await extension.setOptions({ servers: { [SERVER_UUID]: aria2.server }, theme });
    });

    test("options page", async ({ extension }) => {
      const page = await extension.openOptions();
      await expect(page.getByRole("tab", { name: "E2E aria2" })).toBeVisible();
      await expectNoAccessibilityViolations(page);

      await page.getByRole("tab", { name: "E2E aria2" }).click();
      await expectNoAccessibilityViolations(page);
    });

    test("popup", async ({ extension, aria2, fileServer }) => {
      await aria2.call("aria2.addUri", [fileServer.url("/slow/active.iso")]);
      await aria2.call("aria2.pause", await aria2.call("aria2.addUri", [fileServer.url("/slow/paused.iso")]));
      await aria2.call("aria2.addUri", [fileServer.url("/files/complete.bin")]);
      await aria2.call("aria2.addUri", [fileServer.url("/missing/error.bin")]);
      const popup = await extension.openPopup();
      // Every kind of task is shown: active, paused, complete and failed.
      for (const name of ["active.iso", "paused.iso", "complete.bin", "error.bin"]) {
        await expect(popup.getByText(name, { exact: true })).toBeVisible();
      }
      await expectNoAccessibilityViolations(popup);

      await popup.getByRole("button", { name: "Add" }).click();
      await expectNoAccessibilityViolations(popup);

      await popup.getByRole("button", { name: "Cancel" }).click();
      await popup.getByRole("button", { name: "Quick options" }).click();
      await expectNoAccessibilityViolations(popup);
    });
  });
}

test("popup without server", async ({ extension }) => {
  const popup = await extension.openPopup();
  await expect(popup.getByText("No server was found.")).toBeVisible();
  await expectNoAccessibilityViolations(popup);
});
