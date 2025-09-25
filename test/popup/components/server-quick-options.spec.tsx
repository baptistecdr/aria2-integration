import { fireEvent, render, screen } from "@testing-library/react";
import { expect, vi } from "vitest";
import ExtensionOptions from "@/models/extension-options";
import type Server from "@/models/server";
import ServerQuickOptions from "@/popup/components/server-quick-options";

const mockSetExtensionOptions = vi.fn();

vi.spyOn(ExtensionOptions.prototype, "toStorage").mockImplementation(vi.fn());

const server: Server = { uuid: "server-1" } as Server;
const extensionOptions = new ExtensionOptions({ server1: server });

describe("ServerQuickOptions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders checkboxes with correct labels", () => {
    render(<ServerQuickOptions setExtensionOptions={mockSetExtensionOptions} extensionOptions={extensionOptions} server={server} />);

    expect(screen.getByLabelText(/extensionOptionsCaptureDownloads/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/extensionOptionsUseCompleteFilePath/i)).toBeInTheDocument();
  });

  it("calls setExtensionOptions and toStorage on capture downloads change", async () => {
    render(<ServerQuickOptions setExtensionOptions={mockSetExtensionOptions} extensionOptions={extensionOptions} server={server} />);

    const captureDownloadsCheckbox = screen.getByLabelText(/extensionOptionsCaptureDownloads/i);
    fireEvent.click(captureDownloadsCheckbox);

    expect(extensionOptions.toStorage).toHaveBeenCalled();
    await expect.poll(() => mockSetExtensionOptions).toHaveBeenCalled();
  });

  it("calls setExtensionOptions and toStorage on use complete file path change", async () => {
    render(<ServerQuickOptions setExtensionOptions={mockSetExtensionOptions} extensionOptions={extensionOptions} server={server} />);

    const useCompleteFilePathCheckbox = screen.getByLabelText(/extensionOptionsUseCompleteFilePath/i);
    fireEvent.click(useCompleteFilePathCheckbox);

    expect(extensionOptions.toStorage).toHaveBeenCalled();
    await expect.poll(() => mockSetExtensionOptions).toHaveBeenCalled();
  });
});
