import { expect, SERVER_UUID, test } from "./fixtures";

test("asks to add a server when none is configured", async ({ extension }) => {
  const popup = await extension.openPopup();

  await expect(popup.getByText("No server was found.")).toBeVisible();
});

test("shows an error when the server is unreachable", async ({ extension, aria2 }) => {
  await extension.setOptions({ servers: { [SERVER_UUID]: { ...aria2.server, secret: "wrong-secret" } } });
  const popup = await extension.openPopup();

  await expect(popup.getByText("Unable to retrieve tasks.")).toBeVisible();
});

test("shows an empty task list", async ({ extension, aria2 }) => {
  await extension.setOptions({ servers: { [SERVER_UUID]: aria2.server } });
  const popup = await extension.openPopup();

  await expect(popup.getByRole("tab", { name: "E2E aria2" })).toBeVisible();
  await expect(popup.getByText("This place is quiet, so quiet...")).toBeVisible();
});

test("adds URLs to aria2", async ({ extension, aria2, fileServer }) => {
  await extension.setOptions({ servers: { [SERVER_UUID]: aria2.server } });
  const popup = await extension.openPopup();
  const urls = [fileServer.url("/files/first.bin"), fileServer.url("/files/second.bin")];

  await popup.getByRole("button", { name: "Add" }).click();
  await popup.getByPlaceholder("URLs and/or magnets").fill(urls.join("\n"));
  await popup.getByRole("button", { name: "Add" }).first().click();

  await expect.poll(async () => (await aria2.uris()).sort()).toEqual(urls);
  await popup.getByRole("button", { name: "Cancel" }).click();
  await expect(popup.getByText("first.bin")).toBeVisible();
  await expect(popup.getByText("second.bin")).toBeVisible();
  await expect(popup.getByText("Complete, 64 KiB / 64 KiB").first()).toBeVisible();
});

test("pauses, resumes and deletes a task", async ({ extension, aria2, fileServer }) => {
  await extension.setOptions({ servers: { [SERVER_UUID]: aria2.server } });
  const gid = await aria2.call<string>("aria2.addUri", [fileServer.url("/slow/movie.mkv")]);
  const popup = await extension.openPopup();

  await expect(popup.getByText("movie.mkv")).toBeVisible();
  await expect(popup.getByText(/^Active, /)).toBeVisible();

  await popup.getByRole("button", { name: "play-pause-retry" }).click();
  await expect.poll(async () => (await aria2.call("aria2.tellStatus", gid, ["status"])).status).toBe("paused");
  await expect(popup.getByText(/^Paused, /)).toBeVisible();

  await popup.getByRole("button", { name: "play-pause-retry" }).click();
  await expect.poll(async () => (await aria2.call("aria2.tellStatus", gid, ["status"])).status).toBe("active");

  await popup.getByRole("button", { name: "delete" }).click();
  await expect.poll(async () => (await aria2.call("aria2.tellStatus", gid, ["status"])).status).toBe("removed");
  await expect(popup.getByText(/^Removed, /)).toBeVisible();

  // Deleting a removed task drops its result.
  await popup.getByRole("button", { name: "delete" }).click();
  await expect(popup.getByText("movie.mkv")).toHaveCount(0);
  expect(await aria2.tasks()).toEqual([]);
});

test("purges finished tasks", async ({ extension, aria2, fileServer }) => {
  await extension.setOptions({ servers: { [SERVER_UUID]: aria2.server } });
  await aria2.call("aria2.addUri", [fileServer.url("/files/done.bin")]);
  await expect.poll(async () => (await aria2.call("aria2.tellStopped", 0, 10)).length).toBe(1);
  const popup = await extension.openPopup();

  await expect(popup.getByText("done.bin")).toBeVisible();
  await popup.getByRole("button", { name: "Purge" }).click();

  await expect(popup.getByText("This place is quiet, so quiet...")).toBeVisible();
  expect(await aria2.call("aria2.tellStopped", 0, 10)).toEqual([]);
});

test("shows one tab per server", async ({ extension, aria2 }) => {
  const otherUuid = "0b8e5f2a-7c1d-4a3b-9e6f-5d4c3b2a1f0e";
  await extension.setOptions({
    servers: {
      [SERVER_UUID]: aria2.server,
      [otherUuid]: { ...aria2.server, uuid: otherUuid, name: "Other aria2" },
    },
  });
  const popup = await extension.openPopup();

  await expect(popup.getByRole("tab", { name: "E2E aria2" })).toHaveAttribute("aria-selected", "true");
  await popup.getByRole("tab", { name: "Other aria2" }).click();
  await expect(popup.getByRole("tab", { name: "Other aria2" })).toHaveAttribute("aria-selected", "true");
  await expect(popup.getByRole("tabpanel", { name: "Other aria2" }).getByText("This place is quiet, so quiet...")).toBeVisible();
});
