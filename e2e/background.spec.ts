import { expect, SERVER_UUID, test } from "./fixtures";

// Only available inside the extension's service worker, where the evaluated callbacks run.
declare const chrome: any;

test.describe("capture downloads", () => {
  test.beforeEach(async ({ extension, aria2 }) => {
    await extension.setOptions({
      servers: { [SERVER_UUID]: aria2.server },
      captureDownloads: true,
      captureServer: SERVER_UUID,
      excludedFileTypes: ["zip"],
    });
  });

  test("sends the download to aria2 with the referer and cookies", async ({ context, extension, aria2, fileServer }) => {
    const page = await context.newPage();
    await page.goto(fileServer.url("/page.html"));

    await page.locator("#download-bin").click();

    await expect.poll(() => aria2.uris()).toEqual([fileServer.url("/files/archive.bin")]);
    // The browser download is cancelled and erased in favour of aria2.
    await expect.poll(() => extension.serviceWorker.evaluate(async () => (await chrome.downloads.search({})).length)).toBe(0);

    const aria2Request = fileServer.requestsTo("/files/archive.bin").find((request) => request.headers["user-agent"]?.startsWith("aria2"));
    expect(aria2Request?.headers.referer).toBe(fileServer.url("/page.html"));
    expect(aria2Request?.headers.cookie).toContain("session=e2e-cookie");
  });

  test("lets the browser download excluded file types", async ({ context, extension, aria2, fileServer }) => {
    const page = await context.newPage();
    await page.goto(fileServer.url("/page.html"));

    await page.locator("#download-zip").click();
    await expect
      .poll(() => extension.serviceWorker.evaluate(async () => (await chrome.downloads.search({ state: "complete" })).map((d: any) => d.url)))
      .toEqual([fileServer.url("/files/archive.zip")]);

    await page.locator("#download-bin").click();
    await expect.poll(() => aria2.uris()).toEqual([fileServer.url("/files/archive.bin")]);
  });
});

test("shows the number of active downloads in the badge", async ({ extension, aria2, fileServer }) => {
  await extension.setOptions({ servers: { [SERVER_UUID]: aria2.server } });
  await aria2.call("aria2.addUri", [fileServer.url("/slow/first.iso")]);
  await aria2.call("aria2.addUri", [fileServer.url("/slow/second.iso")]);

  await expect.poll(() => extension.serviceWorker.evaluate(() => chrome.action.getBadgeText({})), { timeout: 15_000 }).toBe("2");

  await aria2.call("aria2.forcePauseAll");
  await expect.poll(() => extension.serviceWorker.evaluate(() => chrome.action.getBadgeText({})), { timeout: 15_000 }).toBe("");
});
