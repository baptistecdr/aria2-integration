import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { Server } from "@/domain/server";
import { showNotification } from "@/platform/notifications";
import ServerAddTasks from "@/popup/components/server-add-tasks";
import type { Aria2Client } from "@/services/aria2-client";
import { captureTorrentFile, captureUrl } from "@/services/capture";
import { useCurrentTab } from "@/shared/ui/current-tab-provider";
import { useExtensionOptions } from "@/shared/ui/extension-options-provider";

// A plain object is used instead of `vi.mockObject(new Aria2(...))`: auto-mocking a real Aria2 instance
// (which extends EventTarget) makes vitest's deep-equal assertions on it (toHaveBeenCalledWith) pathologically
// slow (seconds per assertion) once certain other modules are also loaded in the same test file.
const aria2 = { call: vi.fn(), multicall: vi.fn() } as unknown as Aria2Client;
const server = Server.create({ uuid: "uuid", name: "TestServer" });

vi.mock("@/services/capture", () => ({
  captureUrl: vi.fn(),
  captureTorrentFile: vi.fn(),
}));

vi.mock("@/platform/notifications", () => ({
  showNotification: vi.fn(),
}));

vi.mock("@/shared/ui/extension-options-provider", () => ({
  useExtensionOptions: vi.fn(),
}));

vi.mock("@/shared/ui/current-tab-provider", () => ({
  useCurrentTab: vi.fn(),
}));

vi.mock("@/platform/i18n", () => ({
  default: vi.fn((key: string, ...args: any[]) => `${key}${args.length ? `:${args.join(",")}` : ""}`),
}));

const setupDefaultExtensionOptions = (overrides = {}) => {
  vi.mocked(useExtensionOptions).mockReturnValue({
    extensionOptions: {
      notifyUrlIsAdded: true,
      notifyFileIsAdded: true,
      notifyErrorOccurs: true,
      ...overrides,
      incognitoModeOptions: { overwriteRpcParameters: false },
    } as any,
    updateExtensionOptions: vi.fn(),
  });
};

const setupDefaultCurrentTab = (overrides = {}) => {
  vi.mocked(useCurrentTab).mockReturnValue({
    incognito: false,
    ...overrides,
  } as any);
};

// Helper to create test files
const createTestFile = (name: string, content = "content", type = "application/x-bittorrent"): File => {
  return new File([content], name, { type });
};

// Constants for test selectors
const URL_TEXTAREA_PLACEHOLDER = "addTaskAddUrlsPlaceholder";
const FILE_INPUT_LABEL = "addTaskAddFiles";
const ADD_BUTTON_TEXT = "addTaskAdd";

describe("ServerAddTasks", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupDefaultExtensionOptions();
    setupDefaultCurrentTab();
  });

  it("renders URL and File forms with correct labels", () => {
    render(<ServerAddTasks aria2={aria2} server={server} />);

    expect(screen.getByLabelText("addTaskAddUrls")).toBeInTheDocument();
    expect(screen.getByLabelText(FILE_INPUT_LABEL)).toBeInTheDocument();

    const fileInput = screen.getByLabelText(FILE_INPUT_LABEL);
    expect(fileInput).toHaveAttribute("accept", "application/x-bittorrent, .torrent, application/metalink4+xml, application/metalink+xml, .meta4, .metalink");
    expect(fileInput).toHaveAttribute("multiple");

    expect(screen.getByPlaceholderText(URL_TEXTAREA_PLACEHOLDER)).toBeInTheDocument();
    expect(screen.getAllByText(ADD_BUTTON_TEXT)).toHaveLength(2);
  });

  describe("URL Form Submission", () => {
    it("does nothing when submitting empty URL form", async () => {
      const user = userEvent.setup();
      vi.mocked(captureUrl).mockResolvedValue({});

      render(<ServerAddTasks aria2={aria2} server={server} />);
      const textarea = screen.getByPlaceholderText(URL_TEXTAREA_PLACEHOLDER);
      const submitButton = screen.getAllByText(ADD_BUTTON_TEXT)[0];

      await user.clear(textarea);
      await user.click(submitButton);

      expect(captureUrl).not.toHaveBeenCalled();
    });

    it("submits single URL successfully", async () => {
      const user = userEvent.setup();
      vi.mocked(captureUrl).mockResolvedValue({});

      render(<ServerAddTasks aria2={aria2} server={server} />);
      const textarea = screen.getByPlaceholderText(URL_TEXTAREA_PLACEHOLDER) as HTMLTextAreaElement;
      const submitButton = screen.getAllByText(ADD_BUTTON_TEXT)[0];

      await user.type(textarea, "http://test1.com");
      await user.click(submitButton);

      await waitFor(() => {
        expect(captureUrl).toHaveBeenNthCalledWith(1, aria2, server, { url: "http://test1.com", incognito: false });
        expect(showNotification).toHaveBeenCalledWith("addUrlSuccess:TestServer");
        expect(textarea.value).toBe("");
      });
    });

    it("submits multiple URLs successfully", async () => {
      const user = userEvent.setup();
      vi.mocked(captureUrl).mockResolvedValue({});

      render(<ServerAddTasks aria2={aria2} server={server} />);
      const textarea = screen.getByPlaceholderText(URL_TEXTAREA_PLACEHOLDER) as HTMLTextAreaElement;
      const submitButton = screen.getAllByText(ADD_BUTTON_TEXT)[0];

      await user.type(textarea, "http://test1.com\nhttp://test2.com\nhttp://test3.com");
      await user.click(submitButton);

      await waitFor(() => {
        expect(captureUrl).toHaveBeenCalledTimes(3);
        expect(captureUrl).toHaveBeenNthCalledWith(1, aria2, server, { url: "http://test1.com", incognito: false });
        expect(captureUrl).toHaveBeenNthCalledWith(2, aria2, server, { url: "http://test2.com", incognito: false });
        expect(captureUrl).toHaveBeenNthCalledWith(3, aria2, server, { url: "http://test3.com", incognito: false });
        expect(showNotification).toBeCalledTimes(3);
        expect(textarea.value).toBe("");
      });
    });

    it("handles URL submission error", async () => {
      const user = userEvent.setup();
      vi.mocked(captureUrl).mockRejectedValue(new Error("Network error"));

      render(<ServerAddTasks aria2={aria2} server={server} />);
      const textarea = screen.getByPlaceholderText(URL_TEXTAREA_PLACEHOLDER);
      const submitButton = screen.getAllByText(ADD_BUTTON_TEXT)[0];

      await user.type(textarea, "http://test.com");
      await user.click(submitButton);

      await waitFor(() => {
        expect(showNotification).toHaveBeenCalledWith("addUrlError:TestServer");
      });
    });

    it("does not show notification when notifyUrlIsAdded is false", async () => {
      const user = userEvent.setup();
      setupDefaultExtensionOptions({ notifyUrlIsAdded: false });
      vi.mocked(captureUrl).mockResolvedValue({});

      render(<ServerAddTasks aria2={aria2} server={server} />);
      const textarea = screen.getByPlaceholderText(URL_TEXTAREA_PLACEHOLDER);
      const submitButton = screen.getAllByText(ADD_BUTTON_TEXT)[0];

      await user.type(textarea, "http://test.com");
      await user.click(submitButton);

      await waitFor(() => {
        expect(captureUrl).toHaveBeenCalled();
      });

      expect(showNotification).not.toHaveBeenCalledWith("addUrlSuccess:TestServer");
    });

    it("does not show notification when notifyErrorOccurs is false", async () => {
      const user = userEvent.setup();
      setupDefaultExtensionOptions({ notifyErrorOccurs: false });
      vi.mocked(captureUrl).mockRejectedValue(new Error("Network error"));

      render(<ServerAddTasks aria2={aria2} server={server} />);
      const textarea = screen.getByPlaceholderText(URL_TEXTAREA_PLACEHOLDER);
      const submitButton = screen.getAllByText(ADD_BUTTON_TEXT)[0];

      await user.type(textarea, "http://test.com");
      await user.click(submitButton);

      await waitFor(() => {
        expect(captureUrl).toHaveBeenCalled();
      });

      expect(showNotification).not.toHaveBeenCalledWith("addUrlError:TestServer");
    });
  });

  describe("File Form Submission", () => {
    it("does nothing when no files are selected", async () => {
      const user = userEvent.setup();
      render(<ServerAddTasks aria2={aria2} server={server} />);
      const submitButton = screen.getAllByText(ADD_BUTTON_TEXT)[1];

      await user.click(submitButton);

      expect(captureTorrentFile).not.toHaveBeenCalled();
      expect(showNotification).not.toHaveBeenCalled();
    });

    it("submits single file successfully", async () => {
      const user = userEvent.setup();
      vi.mocked(captureTorrentFile).mockResolvedValue({});

      render(<ServerAddTasks aria2={aria2} server={server} />);
      const fileInput = screen.getByLabelText(FILE_INPUT_LABEL) as HTMLInputElement;
      const submitButton = screen.getAllByText(ADD_BUTTON_TEXT)[1];
      const file = createTestFile("test1.torrent");

      await user.upload(fileInput, file);
      await user.click(submitButton);

      await waitFor(() => {
        expect(captureTorrentFile).toHaveBeenNthCalledWith(1, aria2, server, file, false);
      });
    });

    it("submits multiple files successfully", async () => {
      const user = userEvent.setup();
      vi.mocked(captureTorrentFile).mockResolvedValue({});

      render(<ServerAddTasks aria2={aria2} server={server} />);
      const fileInput = screen.getByLabelText(FILE_INPUT_LABEL) as HTMLInputElement;
      const submitButton = screen.getAllByText(ADD_BUTTON_TEXT)[1];
      const file1 = createTestFile("test1.torrent");
      const file2 = createTestFile("test2.torrent");

      await user.upload(fileInput, [file1, file2]);
      await user.click(submitButton);

      await waitFor(() => {
        expect(captureTorrentFile).toHaveBeenCalledTimes(2);
        expect(captureTorrentFile).toHaveBeenNthCalledWith(1, aria2, server, file1, false);
        expect(captureTorrentFile).toHaveBeenNthCalledWith(2, aria2, server, file2, false);
      });
    });

    it("handles file submission error", async () => {
      const user = userEvent.setup();
      vi.mocked(captureTorrentFile).mockRejectedValue(new Error("File error"));

      render(<ServerAddTasks aria2={aria2} server={server} />);
      const fileInput = screen.getByLabelText(FILE_INPUT_LABEL) as HTMLInputElement;
      const submitButton = screen.getAllByText(ADD_BUTTON_TEXT)[1];
      const file = createTestFile("test.torrent");

      await user.upload(fileInput, file);
      await user.click(submitButton);

      await waitFor(() => {
        expect(showNotification).toHaveBeenCalledWith("addFileError:TestServer");
      });
    });

    it("does not show notification when notifyFileIsAdded is false", async () => {
      const user = userEvent.setup();
      setupDefaultExtensionOptions({ notifyFileIsAdded: false });
      vi.mocked(captureTorrentFile).mockResolvedValue({});

      render(<ServerAddTasks aria2={aria2} server={server} />);
      const fileInput = screen.getByLabelText(FILE_INPUT_LABEL) as HTMLInputElement;
      const submitButton = screen.getAllByText(ADD_BUTTON_TEXT)[1];
      const file = createTestFile("test.torrent");

      await user.upload(fileInput, file);
      await user.click(submitButton);

      await waitFor(() => {
        expect(captureTorrentFile).toHaveBeenCalled();
      });

      expect(showNotification).not.toHaveBeenCalledWith("addFileSuccess:TestServer");
    });
  });
});
