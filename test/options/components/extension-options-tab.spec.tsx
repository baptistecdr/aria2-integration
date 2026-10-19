import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useExtensionOptions } from "@/extension-options-provider";
import { ExtensionOptions } from "@/models/extension-options";
import { Server } from "@/models/server";
import Theme from "@/models/theme";
import ExtensionOptionsTab from "@/options/components/extension-options-tab";

vi.mock("@/i18n", () => ({
  default: (key: string) => key,
}));

vi.mock("@/extension-options-provider", () => ({
  useExtensionOptions: vi.fn(),
}));

vi.mock("@/aria2-extension", () => ({
  isOsAndroid: vi.fn().mockResolvedValue(false),
  isChromium: vi.fn().mockReturnValue(false),
}));

describe("ExtensionOptionsTab", () => {
  const server = Server.create({ uuid: "server-1", name: "Server" });
  const extensionOptions = ExtensionOptions.create({ servers: { [server.uuid]: server }, captureServer: server.uuid, captureDownloads: true });

  const renderWithManagedOptions = (managedOptions: Partial<ExtensionOptions>) => {
    vi.mocked(useExtensionOptions).mockReturnValue({ extensionOptions, setExtensionOptions: vi.fn(), managedOptions });
    return render(<ExtensionOptionsTab />);
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("does not show the managed information and leaves fields enabled without a policy", () => {
    renderWithManagedOptions({});

    expect(screen.queryByText("managedOptionsInformation")).not.toBeInTheDocument();
    expect(screen.getByRole("checkbox", { name: "extensionOptionsCaptureDownloads" })).toBeEnabled();
    expect(screen.getByLabelText("extensionOptionsExcludeSites")).toBeEnabled();
    expect(screen.getByLabelText("extensionOptionsNotifyErrorOccurs")).toBeEnabled();
    expect(screen.getByLabelText("extensionOptionsThemeDark")).toBeEnabled();
  });

  it("disables only the managed fields and shows the managed information", () => {
    renderWithManagedOptions({ excludedSites: ["example.com"], notifyErrorOccurs: false, theme: Theme.Dark });

    expect(screen.getByText("managedOptionsInformation")).toBeInTheDocument();
    expect(screen.getByLabelText("extensionOptionsExcludeSites")).toBeDisabled();
    expect(screen.getByLabelText("extensionOptionsNotifyErrorOccurs")).toBeDisabled();
    expect(screen.getByLabelText("extensionOptionsThemeLight")).toBeDisabled();
    expect(screen.getByLabelText("extensionOptionsThemeDark")).toBeDisabled();
    expect(screen.getByLabelText("extensionOptionsExcludeProtocols")).toBeEnabled();
    expect(screen.getByLabelText("extensionOptionsNotifyUrlIsAdded")).toBeEnabled();
  });

  it("disables capture downloads and its server when the capture server is managed", () => {
    renderWithManagedOptions({ captureServer: server.uuid });

    expect(screen.getByRole("checkbox", { name: "extensionOptionsCaptureDownloads" })).toBeDisabled();
    expect(screen.getByRole("combobox", { name: "extensionOptionsCaptureDownloads" })).toBeDisabled();
  });
});
