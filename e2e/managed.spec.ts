import Theme from "@/models/theme";
import { canInstallPolicies, expect, test } from "./fixtures";

const POLICY_SERVER_UUID = "0b6a1f9e-3c2d-4e5f-8a9b-1c2d3e4f5a6b";

test.describe("with an enterprise policy", () => {
  test.skip(!canInstallPolicies(), "Installing Chromium policies requires a writable /etc/opt/chrome_for_testing/policies/managed (Linux)");

  test.describe("valid", () => {
    test.use({
      policy: {
        servers: [{ uuid: POLICY_SERVER_UUID, name: "Policy aria2", host: "aria2.example.lan", port: 6800 }],
        captureServer: POLICY_SERVER_UUID,
        captureDownloads: true,
        theme: Theme.Dark,
      },
    });

    test("disables the options set by the policy", async ({ extension }) => {
      const page = await extension.openOptions();

      await expect(page.getByText("Some options are managed by your organization and can't be changed.")).toBeVisible();
      await expect(page.getByRole("checkbox", { name: "Capture downloads" })).toBeDisabled();
      await expect(page.getByRole("checkbox", { name: "Capture downloads" })).toBeChecked();
      await expect(page.getByRole("combobox", { name: "Capture downloads" })).toBeDisabled();
      await expect(page.getByLabel("Dark", { exact: true })).toBeDisabled();
      await expect(page.getByLabel("Dark", { exact: true })).toBeChecked();
      await expect(page.getByLabel("Exclude Sites")).toBeEnabled();
      await expect(page.getByLabel("Notify when an error occurs")).toBeEnabled();
    });

    test("disables the servers set by the policy", async ({ extension }) => {
      const page = await extension.openOptions();

      await expect(page.getByRole("tab", { name: "+" })).toBeDisabled();
      await page.getByRole("tab", { name: "Policy aria2" }).click();

      await expect(page.getByText("Servers are managed by your organization and can't be changed.")).toBeVisible();
      await expect(page.getByLabel("Name", { exact: true })).toBeDisabled();
      await expect(page.getByLabel("Host", { exact: true })).toHaveValue("aria2.example.lan");
      await expect(page.getByRole("button", { name: "Save" })).toBeDisabled();
      await expect(page.getByRole("button", { name: "Delete" })).toBeDisabled();
      await expect(page.getByRole("button", { name: "Copy UUID" })).toBeEnabled();
    });

    test("does not save the policy in the user's options", async ({ extension }) => {
      await extension.setOptions({ theme: Theme.Light, captureDownloads: false });
      const page = await extension.openOptions();

      await page.getByLabel("Exclude Sites").fill("example.com");
      await page.getByRole("button", { name: "Save" }).click();

      await expect(page.getByText("The options have been saved.")).toBeVisible();
      await expect(page.getByLabel("Dark", { exact: true })).toBeChecked();
      expect(await extension.getOptions()).toMatchObject({
        servers: {},
        captureServer: "",
        captureDownloads: false,
        theme: Theme.Light,
        excludedSites: ["example.com"],
      });
    });
  });

  test.describe("invalid", () => {
    test.use({
      policy: {
        servers: [
          { uuid: POLICY_SERVER_UUID, name: "First", host: "first.lan" },
          { uuid: POLICY_SERVER_UUID, name: "Second", host: "second.lan" },
        ],
        captureDownloads: true,
      },
    });

    test("ignores the whole policy", async ({ extension }) => {
      const page = await extension.openOptions();

      await expect(page.getByRole("tab", { name: "Options" })).toBeVisible();
      await expect(page.getByText("Some options are managed by your organization and can't be changed.")).toHaveCount(0);
      await expect(page.getByRole("checkbox", { name: "Capture downloads" })).toBeEnabled();
      await expect(page.getByRole("checkbox", { name: "Capture downloads" })).not.toBeChecked();
      await expect(page.getByRole("tab", { name: "First" })).toHaveCount(0);
    });
  });
});
