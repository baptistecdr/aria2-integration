import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ExtensionOptions } from "@/models/extension-options";
import { Server } from "@/models/server";
import ServerQuickOptions from "@/popup/components/server-quick-options";

const { mockSetExtensionOptions, mockUseExtensionOptions } = vi.hoisted(() => ({
  mockSetExtensionOptions: vi.fn(),
  mockUseExtensionOptions: vi.fn(),
}));

vi.mock("@/extension-options-provider", () => ({
  useExtensionOptions: mockUseExtensionOptions,
}));

const toStorageSpy = vi.spyOn(ExtensionOptions, "toStorage").mockResolvedValue(ExtensionOptions.create());
const withOverridesSpy = vi.spyOn(ExtensionOptions, "withOverrides").mockImplementation((options, overrides) => ({ ...options, ...overrides }));

const CAPTURE_DOWNLOADS_LABEL = /extensionOptionsCaptureDownloads/i;
const USE_COMPLETE_FILE_PATH_LABEL = /extensionOptionsUseCompleteFilePath/i;

describe("ServerQuickOptions", () => {
  let server: Server;
  let extensionOptions: ExtensionOptions;

  beforeEach(() => {
    vi.clearAllMocks();
    server = Server.create({ uuid: "server-1", name: "Test Server" });
    extensionOptions = ExtensionOptions.create({ servers: { [server.uuid]: server } });

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
      const optionsWithCapture = ExtensionOptions.create({ servers: { [server.uuid]: server }, captureServer: server.uuid, captureDownloads: true });
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
        expect(withOverridesSpy).toHaveBeenCalledWith(extensionOptions, {
          captureServer: server.uuid,
          captureDownloads: true,
        });
        expect(toStorageSpy).toHaveBeenCalled();
      });
    });

    it("disables capture downloads when unchecked", async () => {
      const optionsWithCapture = ExtensionOptions.create({ servers: { [server.uuid]: server }, captureServer: server.uuid, captureDownloads: true });
      mockUseExtensionOptions.mockReturnValue({
        extensionOptions: optionsWithCapture,
        setExtensionOptions: mockSetExtensionOptions,
      });

      const user = userEvent.setup();
      render(<ServerQuickOptions server={server} />);

      const checkbox = screen.getByLabelText(CAPTURE_DOWNLOADS_LABEL);
      await user.click(checkbox);

      await waitFor(() => {
        expect(withOverridesSpy).toHaveBeenCalledWith(optionsWithCapture, {
          captureServer: "",
          captureDownloads: false,
        });
        expect(toStorageSpy).toHaveBeenCalled();
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
      const optionsWithCapture = ExtensionOptions.create({ servers: { [server.uuid]: server }, captureServer: server.uuid, captureDownloads: true });
      mockUseExtensionOptions.mockReturnValue({
        extensionOptions: optionsWithCapture,
        setExtensionOptions: mockSetExtensionOptions,
      });

      render(<ServerQuickOptions server={server} />);

      const checkbox = screen.getByLabelText(USE_COMPLETE_FILE_PATH_LABEL) as HTMLInputElement;
      expect(checkbox.disabled).toBe(false);
    });

    it("is checked when useCompleteFilePath is enabled", () => {
      const optionsWithCompletePath = ExtensionOptions.create({
        servers: { [server.uuid]: server },
        captureServer: server.uuid,
        captureDownloads: true,
        useCompleteFilePath: true,
      });
      mockUseExtensionOptions.mockReturnValue({
        extensionOptions: optionsWithCompletePath,
        setExtensionOptions: mockSetExtensionOptions,
      });

      render(<ServerQuickOptions server={server} />);

      const checkbox = screen.getByLabelText(USE_COMPLETE_FILE_PATH_LABEL) as HTMLInputElement;
      expect(checkbox.checked).toBe(true);
    });

    it("is unchecked when useCompleteFilePath is disabled", () => {
      const optionsWithCapture = ExtensionOptions.create({
        servers: { [server.uuid]: server },
        captureServer: server.uuid,
        captureDownloads: true,
        useCompleteFilePath: false,
      });
      mockUseExtensionOptions.mockReturnValue({
        extensionOptions: optionsWithCapture,
        setExtensionOptions: mockSetExtensionOptions,
      });

      render(<ServerQuickOptions server={server} />);

      const checkbox = screen.getByLabelText(USE_COMPLETE_FILE_PATH_LABEL) as HTMLInputElement;
      expect(checkbox.checked).toBe(false);
    });

    it("calls withOverrides with correct value when checked", async () => {
      const optionsWithCapture = ExtensionOptions.create({ servers: { [server.uuid]: server }, captureServer: server.uuid, captureDownloads: true });
      mockUseExtensionOptions.mockReturnValue({
        extensionOptions: optionsWithCapture,
        setExtensionOptions: mockSetExtensionOptions,
      });

      const user = userEvent.setup();
      render(<ServerQuickOptions server={server} />);

      const checkbox = screen.getByLabelText(USE_COMPLETE_FILE_PATH_LABEL);
      await user.click(checkbox);

      await waitFor(() => {
        expect(withOverridesSpy).toHaveBeenCalledWith(optionsWithCapture, {
          useCompleteFilePath: true,
        });
        expect(toStorageSpy).toHaveBeenCalled();
        expect(mockSetExtensionOptions).toHaveBeenCalled();
      });
    });
  });

  describe("Integration", () => {
    it("enables use complete file path checkbox when capture downloads is checked", async () => {
      const user = userEvent.setup();
      const optionsWithCapture = ExtensionOptions.create({ servers: { [server.uuid]: server }, captureServer: server.uuid, captureDownloads: true });

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
      const server2 = Server.create({ uuid: "server-2", name: "Another Server" });
      const optionsWithCaptureOnDifferentServer = ExtensionOptions.create({
        servers: { [server.uuid]: server, [server2.uuid]: server2 },
        captureServer: server2.uuid,
        captureDownloads: true,
      });
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
