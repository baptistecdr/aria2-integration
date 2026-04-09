import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import ExtensionOptions from "@/models/extension-options";
import Server from "@/models/server";
import ServerQuickOptions from "@/popup/components/server-quick-options";

const { mockSetExtensionOptions, mockUseExtensionOptions } = vi.hoisted(() => ({
  mockSetExtensionOptions: vi.fn(),
  mockUseExtensionOptions: vi.fn(),
}));

vi.mock("@/extension-options-provider", () => ({
  useExtensionOptions: mockUseExtensionOptions,
}));

vi.spyOn(ExtensionOptions.prototype, "toStorage").mockResolvedValue(vi.mockObject(new ExtensionOptions()));
vi.spyOn(ExtensionOptions.prototype, "withOverrides").mockImplementation(function (this: ExtensionOptions, overrides) {
  return Object.assign(Object.create(Object.getPrototypeOf(this)), this, overrides);
});

const CAPTURE_DOWNLOADS_LABEL = /extensionOptionsCaptureDownloads/i;
const USE_COMPLETE_FILE_PATH_LABEL = /extensionOptionsUseCompleteFilePath/i;

describe("ServerQuickOptions", () => {
  let server: Server;
  let extensionOptions: ExtensionOptions;

  beforeEach(() => {
    vi.clearAllMocks();
    server = new Server("server-1", "Test Server");
    extensionOptions = new ExtensionOptions({ [server.uuid]: server });

    mockUseExtensionOptions.mockReturnValue({
      extensionOptions,
      setExtensionOptions: mockSetExtensionOptions,
    });
  });

  it("renders checkboxes with correct labels", () => {
    render(<ServerQuickOptions server={server} />);

    expect(screen.getByLabelText(CAPTURE_DOWNLOADS_LABEL)).toBeInTheDocument();
    expect(screen.getByLabelText(USE_COMPLETE_FILE_PATH_LABEL)).toBeInTheDocument();
  });

  describe("Capture Downloads Checkbox", () => {
    it("is unchecked initially when capture downloads is disabled", () => {
      render(<ServerQuickOptions server={server} />);

      const checkbox = screen.getByLabelText(CAPTURE_DOWNLOADS_LABEL) as HTMLInputElement;
      expect(checkbox.checked).toBe(false);
    });

    it("is checked when capture is enabled on this server", () => {
      const optionsWithCapture = new ExtensionOptions({ [server.uuid]: server }, server.uuid, true);
      mockUseExtensionOptions.mockReturnValue({
        extensionOptions: optionsWithCapture,
        setExtensionOptions: mockSetExtensionOptions,
      });

      render(<ServerQuickOptions server={server} />);

      const checkbox = screen.getByLabelText(CAPTURE_DOWNLOADS_LABEL) as HTMLInputElement;
      expect(checkbox.checked).toBe(true);
    });

    it("enables capture downloads with correct server uuid when checked", async () => {
      const user = userEvent.setup();
      render(<ServerQuickOptions server={server} />);

      const checkbox = screen.getByLabelText(CAPTURE_DOWNLOADS_LABEL);
      await user.click(checkbox);

      await waitFor(() => {
        expect(extensionOptions.withOverrides).toHaveBeenCalledWith({
          captureServer: server.uuid,
          captureDownloads: true,
        });
        expect(extensionOptions.toStorage).toHaveBeenCalled();
      });
    });

    it("disables capture downloads when unchecked", async () => {
      const optionsWithCapture = new ExtensionOptions({ [server.uuid]: server }, server.uuid, true);
      mockUseExtensionOptions.mockReturnValue({
        extensionOptions: optionsWithCapture,
        setExtensionOptions: mockSetExtensionOptions,
      });

      const user = userEvent.setup();
      render(<ServerQuickOptions server={server} />);

      const checkbox = screen.getByLabelText(CAPTURE_DOWNLOADS_LABEL);
      await user.click(checkbox);

      await waitFor(() => {
        expect(optionsWithCapture.withOverrides).toHaveBeenCalledWith({
          captureServer: "",
          captureDownloads: false,
        });
        expect(extensionOptions.toStorage).toHaveBeenCalled();
      });
    });
  });

  describe("Use Complete File Path Checkbox", () => {
    it("is disabled when capture downloads is not enabled on this server", () => {
      render(<ServerQuickOptions server={server} />);

      const checkbox = screen.getByLabelText(USE_COMPLETE_FILE_PATH_LABEL) as HTMLInputElement;
      expect(checkbox.disabled).toBe(true);
    });

    it("is enabled when capture downloads is enabled on this server", () => {
      const optionsWithCapture = new ExtensionOptions({ [server.uuid]: server }, server.uuid, true);
      mockUseExtensionOptions.mockReturnValue({
        extensionOptions: optionsWithCapture,
        setExtensionOptions: mockSetExtensionOptions,
      });

      render(<ServerQuickOptions server={server} />);

      const checkbox = screen.getByLabelText(USE_COMPLETE_FILE_PATH_LABEL) as HTMLInputElement;
      expect(checkbox.disabled).toBe(false);
    });

    it("is checked when useCompleteFilePath is enabled", () => {
      const optionsWithCompletePath = new ExtensionOptions({ [server.uuid]: server }, server.uuid, true, 0, [], [], [], true);
      mockUseExtensionOptions.mockReturnValue({
        extensionOptions: optionsWithCompletePath,
        setExtensionOptions: mockSetExtensionOptions,
      });

      render(<ServerQuickOptions server={server} />);

      const checkbox = screen.getByLabelText(USE_COMPLETE_FILE_PATH_LABEL) as HTMLInputElement;
      expect(checkbox.checked).toBe(true);
    });

    it("is unchecked when useCompleteFilePath is disabled", () => {
      const optionsWithCapture = new ExtensionOptions({ [server.uuid]: server }, server.uuid, true, 0, [], [], [], false);
      mockUseExtensionOptions.mockReturnValue({
        extensionOptions: optionsWithCapture,
        setExtensionOptions: mockSetExtensionOptions,
      });

      render(<ServerQuickOptions server={server} />);

      const checkbox = screen.getByLabelText(USE_COMPLETE_FILE_PATH_LABEL) as HTMLInputElement;
      expect(checkbox.checked).toBe(false);
    });

    it("calls withOverrides with correct value when checked", async () => {
      const optionsWithCapture = new ExtensionOptions({ [server.uuid]: server }, server.uuid, true);
      mockUseExtensionOptions.mockReturnValue({
        extensionOptions: optionsWithCapture,
        setExtensionOptions: mockSetExtensionOptions,
      });

      const user = userEvent.setup();
      render(<ServerQuickOptions server={server} />);

      const checkbox = screen.getByLabelText(USE_COMPLETE_FILE_PATH_LABEL);
      await user.click(checkbox);

      await waitFor(() => {
        expect(optionsWithCapture.withOverrides).toHaveBeenCalledWith({
          useCompleteFilePath: true,
        });
        expect(optionsWithCapture.toStorage).toHaveBeenCalled();
        expect(mockSetExtensionOptions).toHaveBeenCalled();
      });
    });
  });

  describe("Integration", () => {
    it("enables use complete file path checkbox when capture downloads is checked", async () => {
      const user = userEvent.setup();
      const optionsWithCapture = new ExtensionOptions({ [server.uuid]: server }, server.uuid, true);

      mockUseExtensionOptions.mockReturnValue({
        extensionOptions,
        setExtensionOptions: mockSetExtensionOptions,
      });

      render(<ServerQuickOptions server={server} />);

      const captureCheckbox = screen.getByLabelText(CAPTURE_DOWNLOADS_LABEL);
      const useCompletePathCheckbox = screen.getByLabelText(USE_COMPLETE_FILE_PATH_LABEL) as HTMLInputElement;

      expect(useCompletePathCheckbox.disabled).toBe(true);

      // Mock the updated options after capture is enabled
      mockUseExtensionOptions.mockReturnValue({
        extensionOptions: optionsWithCapture,
        setExtensionOptions: mockSetExtensionOptions,
      });

      await user.click(captureCheckbox);

      await waitFor(() => {
        expect(mockSetExtensionOptions).toHaveBeenCalled();
      });
    });

    it("does not update use complete file path when capture downloads is different server", () => {
      const server2 = new Server("server-2", "Another Server");
      const optionsWithCaptureOnDifferentServer = new ExtensionOptions({ [server.uuid]: server, [server2.uuid]: server2 }, server2.uuid, true);
      mockUseExtensionOptions.mockReturnValue({
        extensionOptions: optionsWithCaptureOnDifferentServer,
        setExtensionOptions: mockSetExtensionOptions,
      });

      render(<ServerQuickOptions server={server} />);

      const checkbox = screen.getByLabelText(USE_COMPLETE_FILE_PATH_LABEL) as HTMLInputElement;
      expect(checkbox.disabled).toBe(true);
    });
  });
});
