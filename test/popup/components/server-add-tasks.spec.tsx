import Aria2 from "@baptistecdr/aria2";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { captureTorrentFromFile, captureURL, showNotification } from "@/aria2-extension";
import { useExtensionOptions } from "@/extension-options-provider";
import Server from "@/models/server";
import ServerAddTasks from "@/popup/components/server-add-tasks";

const aria2 = vi.mockObject(new Aria2());
const server = vi.mockObject(new Server("uuid", "TestServer"));

vi.mock("@/aria2-extension", () => ({
  captureURL: vi.fn(),
  captureTorrentFromFile: vi.fn(),
  showNotification: vi.fn(),
}));

vi.mock("@/extension-options-provider", () => ({
  useExtensionOptions: vi.fn(),
}));

vi.mock("@/i18n", () => ({
  default: vi.fn((key: string, ...args: any[]) => `${key}${args.length ? `:${args.join(",")}` : ""}`),
}));

// Helper to setup default extension options
const setupDefaultExtensionOptions = (overrides = {}) => {
  vi.mocked(useExtensionOptions).mockReturnValue({
    extensionOptions: {
      notifyUrlIsAdded: true,
      notifyFileIsAdded: true,
      notifyErrorOccurs: true,
      ...overrides,
    } as any,
    setExtensionOptions: vi.fn(),
  });
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
      vi.mocked(captureURL).mockResolvedValue({});

      render(<ServerAddTasks aria2={aria2} server={server} />);
      const textarea = screen.getByPlaceholderText(URL_TEXTAREA_PLACEHOLDER);
      const submitButton = screen.getAllByText(ADD_BUTTON_TEXT)[0];

      await user.clear(textarea);
      await user.click(submitButton);

      expect(captureURL).not.toHaveBeenCalled();
    });

    it("submits single URL successfully", async () => {
      const user = userEvent.setup();
      vi.mocked(captureURL).mockResolvedValue({});

      render(<ServerAddTasks aria2={aria2} server={server} />);
      const textarea = screen.getByPlaceholderText(URL_TEXTAREA_PLACEHOLDER) as HTMLTextAreaElement;
      const submitButton = screen.getAllByText(ADD_BUTTON_TEXT)[0];

      await user.type(textarea, "http://test1.com");
      await user.click(submitButton);

      await waitFor(() => {
        expect(captureURL).toHaveBeenNthCalledWith(1, aria2, server, "http://test1.com", "", "", false);
        expect(showNotification).toHaveBeenCalledWith("addUrlSuccess:TestServer");
        expect(textarea.value).toBe("");
      });
    });

    it("submits multiple URLs successfully", async () => {
      const user = userEvent.setup();
      vi.mocked(captureURL).mockResolvedValue({});

      render(<ServerAddTasks aria2={aria2} server={server} />);
      const textarea = screen.getByPlaceholderText(URL_TEXTAREA_PLACEHOLDER) as HTMLTextAreaElement;
      const submitButton = screen.getAllByText(ADD_BUTTON_TEXT)[0];

      await user.type(textarea, "http://test1.com\nhttp://test2.com\nhttp://test3.com");
      await user.click(submitButton);

      await waitFor(() => {
        expect(captureURL).toHaveBeenCalledTimes(3);
        expect(captureURL).toHaveBeenNthCalledWith(1, aria2, server, "http://test1.com", "", "", false);
        expect(captureURL).toHaveBeenNthCalledWith(2, aria2, server, "http://test2.com", "", "", false);
        expect(captureURL).toHaveBeenNthCalledWith(3, aria2, server, "http://test3.com", "", "", false);
        expect(showNotification).toBeCalledTimes(3);
        expect(textarea.value).toBe("");
      });
    });

    it("handles URL submission error", async () => {
      const user = userEvent.setup();
      vi.mocked(captureURL).mockRejectedValue(new Error("Network error"));

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
      vi.mocked(captureURL).mockResolvedValue({});

      render(<ServerAddTasks aria2={aria2} server={server} />);
      const textarea = screen.getByPlaceholderText(URL_TEXTAREA_PLACEHOLDER);
      const submitButton = screen.getAllByText(ADD_BUTTON_TEXT)[0];

      await user.type(textarea, "http://test.com");
      await user.click(submitButton);

      await waitFor(() => {
        expect(captureURL).toHaveBeenCalled();
      });

      expect(showNotification).not.toHaveBeenCalledWith("addUrlSuccess:TestServer");
    });

    it("does not show notification when notifyErrorOccurs is false", async () => {
      const user = userEvent.setup();
      setupDefaultExtensionOptions({ notifyErrorOccurs: false });
      vi.mocked(captureURL).mockRejectedValue(new Error("Network error"));

      render(<ServerAddTasks aria2={aria2} server={server} />);
      const textarea = screen.getByPlaceholderText(URL_TEXTAREA_PLACEHOLDER);
      const submitButton = screen.getAllByText(ADD_BUTTON_TEXT)[0];

      await user.type(textarea, "http://test.com");
      await user.click(submitButton);

      await waitFor(() => {
        expect(captureURL).toHaveBeenCalled();
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

      expect(captureTorrentFromFile).not.toHaveBeenCalled();
      expect(showNotification).not.toHaveBeenCalled();
    });

    it("submits single file successfully", async () => {
      const user = userEvent.setup();
      vi.mocked(captureTorrentFromFile).mockResolvedValue({});

      render(<ServerAddTasks aria2={aria2} server={server} />);
      const fileInput = screen.getByLabelText(FILE_INPUT_LABEL) as HTMLInputElement;
      const submitButton = screen.getAllByText(ADD_BUTTON_TEXT)[1];
      const file = createTestFile("test1.torrent");

      await user.upload(fileInput, file);
      await user.click(submitButton);

      await waitFor(() => {
        expect(captureTorrentFromFile).toHaveBeenNthCalledWith(1, aria2, server, file);
      });
    });

    it("submits multiple files successfully", async () => {
      const user = userEvent.setup();
      vi.mocked(captureTorrentFromFile).mockResolvedValue({});

      render(<ServerAddTasks aria2={aria2} server={server} />);
      const fileInput = screen.getByLabelText(FILE_INPUT_LABEL) as HTMLInputElement;
      const submitButton = screen.getAllByText(ADD_BUTTON_TEXT)[1];
      const file1 = createTestFile("test1.torrent");
      const file2 = createTestFile("test2.torrent");

      await user.upload(fileInput, [file1, file2]);
      await user.click(submitButton);

      await waitFor(() => {
        expect(captureTorrentFromFile).toHaveBeenCalledTimes(2);
        expect(captureTorrentFromFile).toHaveBeenNthCalledWith(1, aria2, server, file1);
        expect(captureTorrentFromFile).toHaveBeenNthCalledWith(2, aria2, server, file2);
      });
    });

    it("handles file submission error", async () => {
      const user = userEvent.setup();
      vi.mocked(captureTorrentFromFile).mockRejectedValue(new Error("File error"));

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
      vi.mocked(captureTorrentFromFile).mockResolvedValue({});

      render(<ServerAddTasks aria2={aria2} server={server} />);
      const fileInput = screen.getByLabelText(FILE_INPUT_LABEL) as HTMLInputElement;
      const submitButton = screen.getAllByText(ADD_BUTTON_TEXT)[1];
      const file = createTestFile("test.torrent");

      await user.upload(fileInput, file);
      await user.click(submitButton);

      await waitFor(() => {
        expect(captureTorrentFromFile).toHaveBeenCalled();
      });

      expect(showNotification).not.toHaveBeenCalledWith("addFileSuccess:TestServer");
    });
  });
});
