import { expect, SERVER_UUID, test } from "./fixtures";

test("opens the options page on install", async ({ context, extension }) => {
  // Chromium embeds the options page (options_ui) in the extensions page.
  await expect.poll(() => context.pages().map((page) => page.url())).toContain(`chrome://extensions/?options=${extension.id}`);
});

test("adds a server and saves its settings", async ({ extension }) => {
  const page = await extension.openOptions();

  await page.getByRole("tab", { name: "+" }).click();
  await expect(page.getByRole("tab", { name: "Localhost" })).toHaveAttribute("aria-selected", "true");

  await page.getByLabel("Name", { exact: true }).fill("My NAS");
  await page.getByLabel("Host", { exact: true }).fill("nas.local");
  await page.getByLabel("Port", { exact: true }).fill("6801");
  await page.getByLabel("Secure Connection", { exact: true }).check();
  await page.getByLabel("Secret", { exact: true }).fill("s3cr3t");
  await page.getByLabel("RPC Parameters").first().fill("split: 5\nall-proxy: http://proxy:8080");
  await expect(page.getByLabel("URL", { exact: true })).toHaveValue("https://nas.local:6801/jsonrpc");
  await page.getByRole("button", { name: "Save" }).click();

  await expect(page.getByRole("alert")).toContainText("The options have been saved.");
  await expect(page.getByRole("tab", { name: "My NAS" })).toBeVisible();

  const servers = Object.values((await extension.getOptions()).servers);
  expect(servers).toHaveLength(1);
  expect(servers[0]).toMatchObject({
    name: "My NAS",
    host: "nas.local",
    port: 6801,
    secure: true,
    secret: "s3cr3t",
    rpcParameters: { split: "5", "all-proxy": "http://proxy:8080" },
  });
});

test("deletes a server", async ({ extension, aria2 }) => {
  await extension.setOptions({ servers: { [SERVER_UUID]: aria2.server }, captureServer: SERVER_UUID, captureDownloads: true });
  const page = await extension.openOptions();

  await page.getByRole("tab", { name: "E2E aria2" }).click();
  await page.getByRole("button", { name: "Delete" }).click();

  await expect(page.getByRole("tab", { name: "E2E aria2" })).toHaveCount(0);
  await expect(page.getByRole("tab", { name: "Options" })).toHaveAttribute("aria-selected", "true");
  const options = await extension.getOptions();
  expect(options.servers).toEqual({});
  expect(options.captureServer).toBe("");
  expect(options.captureDownloads).toBe(false);
});

test("saves the extension options", async ({ extension, aria2 }) => {
  await extension.setOptions({ servers: { [SERVER_UUID]: aria2.server } });
  const page = await extension.openOptions();
  await expect(page.getByRole("tab", { name: "E2E aria2" })).toBeVisible();

  await page.getByRole("checkbox", { name: "Capture downloads" }).check();
  await page.getByRole("combobox", { name: "Capture downloads" }).selectOption({ label: "E2E aria2" });
  await page.getByLabel("Exclude Protocols").fill("ftp, magnet");
  await page.getByLabel("Exclude Sites").fill("example.com");
  await page.getByLabel("Exclude File Types").fill("zip, rar");
  await page.getByLabel("Notify when an URL is added").uncheck();
  await page.getByRole("button", { name: "Save" }).click();

  await expect(page.getByRole("alert")).toContainText("The options have been saved.");
  expect(await extension.getOptions()).toMatchObject({
    captureDownloads: true,
    captureServer: SERVER_UUID,
    excludedProtocols: ["ftp", "magnet"],
    excludedSites: ["example.com"],
    excludedFileTypes: ["zip", "rar"],
    notifyUrlIsAdded: false,
    notifyFileIsAdded: true,
  });
});
