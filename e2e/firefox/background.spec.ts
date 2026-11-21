import { SERVER_UUID } from "../fixtures";
import { expect, test } from "./fixtures";

test.describe("capture downloads in Firefox", () => {
  test.beforeEach(async ({ extension, aria2 }) => {
    await extension.setOptions({
      servers: { [SERVER_UUID]: aria2.server },
      captureDownloads: true,
      captureServer: SERVER_UUID,
      excludedFileTypes: ["zip"],
    });
  });

  test("sends the download to aria2 with the referer and cookies", async ({ extension, aria2, fileServer }) => {
    await extension.click(fileServer.url("/page.html"), "#download-bin");

    await expect.poll(() => aria2.uris()).toEqual([fileServer.url("/files/archive.bin")]);
    // The browser download is cancelled and erased in favour of aria2.
    await expect.poll(() => extension.browserDownloads()).toEqual([]);

    const aria2Request = fileServer.requestsTo("/files/archive.bin").find((request) => request.headers["user-agent"]?.startsWith("aria2"));
    expect(aria2Request?.headers.referer).toBe(fileServer.url("/page.html"));
    expect(aria2Request?.headers.cookie).toContain("session=e2e-cookie");
  });

  test("lets the browser download excluded file types", async ({ extension, aria2, fileServer }) => {
    await extension.click(fileServer.url("/page.html"), "#download-zip");

    await expect.poll(() => extension.browserDownloads()).toEqual([{ url: fileServer.url("/files/archive.zip"), state: "complete" }]);
    expect(await aria2.uris()).toEqual([]);
  });

  // Regression test for https://github.com/baptistecdr/aria2-integration/issues/1356: after a restart, Firefox only starts
  // the background script to dispatch the download event, before the extension has loaded its options.
  test("sends the download that starts the background script to aria2", async ({ extension, aria2, fileServer }) => {
    await extension.stopBackground();
    expect(await extension.backgroundState()).toBe("stopped");

    await extension.click(fileServer.url("/page.html"), "#download-bin");

    await expect.poll(() => aria2.uris()).toEqual([fileServer.url("/files/archive.bin")]);
    expect(await extension.backgroundState()).toBe("running");
  });
});
