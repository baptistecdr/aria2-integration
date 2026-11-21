import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ExtensionOptions } from "@/domain/extension-options";
import { Server } from "@/domain/server";
import ExtensionOptionsTab from "@/options/components/extension-options-tab";
import { useExtensionOptions } from "@/shared/ui/extension-options-provider";

vi.mock("@/platform/i18n", () => ({
  default: (key: string) => key,
}));

vi.mock("@/platform/browser-info", () => ({
  isChromium: vi.fn().mockReturnValue(true),
  isOsAndroid: vi.fn().mockResolvedValue(false),
}));

vi.mock("@/shared/ui/extension-options-provider", () => ({
  useExtensionOptions: vi.fn(),
}));

describe("ExtensionOptionsTab", () => {
  const server = Server.create({ uuid: "server1", name: "NAS" });
  let current: ExtensionOptions;
  const updateExtensionOptions = vi.fn();

  // Renders the tab with the given options, like the provider does.
  const showOptions = (options: ExtensionOptions) => {
    current = options;
    vi.mocked(useExtensionOptions).mockReturnValue({ extensionOptions: current, updateExtensionOptions });
  };

  beforeEach(() => {
    vi.clearAllMocks();
    updateExtensionOptions.mockImplementation(async (updater) => updater(current));
    showOptions(ExtensionOptions.create({ servers: { server1: server }, excludedSites: ["example.com"], minFileSizeInBytes: 2048 }));
  });

  it("shows the options", async () => {
    render(<ExtensionOptionsTab />);

    expect(screen.getByLabelText("extensionOptionsExcludeSites")).toHaveValue("example.com");
    expect(screen.getByRole("spinbutton")).toHaveValue(2);
    expect(screen.getByLabelText("extensionOptionsNotifyUrlIsAdded")).toBeChecked();
  });

  it("saves the edited options and keeps the servers", async () => {
    const user = userEvent.setup();
    render(<ExtensionOptionsTab />);

    await user.click(screen.getByRole("checkbox", { name: "extensionOptionsCaptureDownloads" }));
    await user.selectOptions(screen.getByRole("combobox", { name: "extensionOptionsCaptureDownloads" }), "server1");
    await user.clear(screen.getByLabelText("extensionOptionsExcludeFileTypes"));
    await user.type(screen.getByLabelText("extensionOptionsExcludeFileTypes"), "zip, rar");
    await user.click(screen.getByLabelText("extensionOptionsNotifyUrlIsAdded"));
    await user.click(screen.getByRole("button", { name: "serverOptionsSave" }));

    const saved: ExtensionOptions = await updateExtensionOptions.mock.results[0].value;
    expect(saved).toMatchObject({
      servers: { server1: server },
      captureDownloads: true,
      captureServer: "server1",
      excludedSites: ["example.com"],
      excludedFileTypes: ["zip", "rar"],
      minFileSizeInBytes: 2048,
      notifyUrlIsAdded: false,
    });
    expect(await screen.findByText("serverOptionsSuccess")).toBeInTheDocument();
  });

  it("can't be saved while capture downloads is enabled without a server", async () => {
    const user = userEvent.setup();
    render(<ExtensionOptionsTab />);

    await user.click(screen.getByRole("checkbox", { name: "extensionOptionsCaptureDownloads" }));

    expect(screen.getByRole("button", { name: "serverOptionsSave" })).toBeDisabled();
  });

  it("shows the new options when they change elsewhere, e.g. once loaded or from the popup", () => {
    const { rerender } = render(<ExtensionOptionsTab />);

    showOptions(ExtensionOptions.withOverrides(current, { excludedSites: ["changed.com"] }));
    rerender(<ExtensionOptionsTab />);

    expect(screen.getByLabelText("extensionOptionsExcludeSites")).toHaveValue("changed.com");
  });

  it("keeps the confirmation visible once the saved options are shown", async () => {
    const user = userEvent.setup();
    const { rerender } = render(<ExtensionOptionsTab />);
    await user.click(screen.getByLabelText("extensionOptionsNotifyUrlIsAdded"));
    await user.click(screen.getByRole("button", { name: "serverOptionsSave" }));
    await screen.findByText("serverOptionsSuccess");

    showOptions(await updateExtensionOptions.mock.results[0].value);
    rerender(<ExtensionOptionsTab />);

    expect(screen.getByText("serverOptionsSuccess")).toBeInTheDocument();
    expect(screen.getByLabelText("extensionOptionsNotifyUrlIsAdded")).not.toBeChecked();
  });

  it("shows an error when the options can't be saved", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    updateExtensionOptions.mockRejectedValueOnce(new Error("quota exceeded"));
    const user = userEvent.setup();
    render(<ExtensionOptionsTab />);

    await user.click(screen.getByRole("button", { name: "serverOptionsSave" }));

    await waitFor(() => expect(screen.getByText("serverOptionsError")).toBeInTheDocument());
  });
});
