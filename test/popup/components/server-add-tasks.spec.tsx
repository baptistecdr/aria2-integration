// @ts-expect-error No types available
import Aria2 from "@baptistecdr/aria2";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { captureTorrentFromFile, captureURL, showNotification } from "@/aria2-extension";
import ExtensionOptions from "@/models/extension-options";
import Server from "@/models/server";
import ServerAddTasks from "@/popup/components/server-add-tasks";

const aria2 = vi.mockObject(new Aria2());
const server = vi.mockObject(new Server("uuid", "TestServer"));
const extensionOptions = vi.mockObject(new ExtensionOptions());

vi.mock("@/aria2-extension", () => ({
  captureURL: vi.fn(),
  captureTorrentFromFile: vi.fn(),
  showNotification: vi.fn(),
}));

vi.mock("@/i18n", () => ({
  default: vi.fn((key: string, ...args: any[]) => `${key}${args.length ? `:${args.join(",")}` : ""}`),
}));

describe("ServerAddTasks", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(extensionOptions, "notifyUrlIsAdded", "get").mockReturnValue(true);
    vi.spyOn(extensionOptions, "notifyFileIsAdded", "get").mockReturnValue(true);
    vi.spyOn(extensionOptions, "notifyErrorOccurs", "get").mockReturnValue(true);
  });

  it("renders URL and File forms with correct labels", () => {
    render(<ServerAddTasks aria2={aria2} server={server} extensionOptions={extensionOptions} />);

    expect(screen.getByLabelText("addTaskAddUrls")).toBeInTheDocument();
    expect(screen.getByLabelText("addTaskAddFiles")).toBeInTheDocument();

    const fileInput = screen.getByLabelText("addTaskAddFiles");
    expect(fileInput).toHaveAttribute("accept", "application/x-bittorrent, .torrent, application/metalink4+xml, application/metalink+xml, .meta4, .metalink");
    expect(fileInput).toHaveAttribute("multiple");

    expect(screen.getByPlaceholderText("addTaskAddUrlsPlaceholder")).toBeInTheDocument();
    expect(screen.getAllByText("addTaskAdd")).toHaveLength(2); // One for URL form, one for file form
  });

  describe("URL Form Submission", () => {
    it("does nothing when submitting empty URL form", () => {
      vi.mocked(captureURL).mockResolvedValue({});

      render(<ServerAddTasks aria2={aria2} server={server} extensionOptions={extensionOptions} />);
      const textarea = screen.getByPlaceholderText("addTaskAddUrlsPlaceholder");
      const submitButton = screen.getAllByText("addTaskAdd")[0];

      fireEvent.change(textarea, { target: { value: "" } });
      fireEvent.click(submitButton);

      expect(captureURL).not.toHaveBeenCalledWith(aria2, server, "", "", "");
    });

    it("submits single URL successfully", async () => {
      vi.mocked(captureURL).mockResolvedValue({});

      render(<ServerAddTasks aria2={aria2} server={server} extensionOptions={extensionOptions} />);
      const textarea = screen.getByPlaceholderText("addTaskAddUrlsPlaceholder") as HTMLTextAreaElement;
      const submitButton = screen.getAllByText("addTaskAdd")[0];

      fireEvent.change(textarea, { target: { value: "http://test1.com" } });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(captureURL).toHaveBeenNthCalledWith(1, aria2, server, "http://test1.com", "", "");
        expect(showNotification).toHaveBeenCalledWith("addUrlSuccess:TestServer");
        expect(textarea.value).toBe("");
      });
    });

    it("submits multiple URLs successfully", async () => {
      vi.mocked(captureURL).mockResolvedValue({});

      render(<ServerAddTasks aria2={aria2} server={server} extensionOptions={extensionOptions} />);
      const textarea = screen.getByPlaceholderText("addTaskAddUrlsPlaceholder") as HTMLTextAreaElement;
      const submitButton = screen.getAllByText("addTaskAdd")[0];

      fireEvent.change(textarea, { target: { value: "http://test1.com\nhttp://test2.com\nhttp://test3.com" } });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(captureURL).toHaveBeenCalledTimes(3);
        expect(captureURL).toHaveBeenNthCalledWith(1, aria2, server, "http://test1.com", "", "");
        expect(captureURL).toHaveBeenNthCalledWith(2, aria2, server, "http://test2.com", "", "");
        expect(captureURL).toHaveBeenNthCalledWith(3, aria2, server, "http://test3.com", "", "");
        expect(showNotification).toBeCalledTimes(3);
        expect(textarea.value).toBe("");
      });
    });

    it("handles URL submission error", async () => {
      vi.mocked(captureURL).mockRejectedValue(new Error("Network error"));

      render(<ServerAddTasks aria2={aria2} server={server} extensionOptions={extensionOptions} />);
      const textarea = screen.getByPlaceholderText("addTaskAddUrlsPlaceholder");
      const submitButton = screen.getAllByText("addTaskAdd")[0];

      fireEvent.change(textarea, { target: { value: "http://test.com" } });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(showNotification).toHaveBeenCalledWith("addUrlError:TestServer");
      });
    });

    it("does not show notification when notifyUrlIsAdded is false", async () => {
      vi.spyOn(extensionOptions, "notifyUrlIsAdded", "get").mockReturnValue(false);
      vi.mocked(captureURL).mockResolvedValue({});

      render(<ServerAddTasks aria2={aria2} server={server} extensionOptions={extensionOptions} />);
      const textarea = screen.getByPlaceholderText("addTaskAddUrlsPlaceholder");
      const submitButton = screen.getAllByText("addTaskAdd")[0];

      fireEvent.change(textarea, { target: { value: "http://test.com" } });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(captureURL).toHaveBeenCalled();
      });

      expect(showNotification).not.toHaveBeenCalledWith("addUrlSuccess:TestServer");
    });

    it("does not show notification when notifyErrorOccurs is false", async () => {
      vi.spyOn(extensionOptions, "notifyErrorOccurs", "get").mockReturnValue(false);
      vi.mocked(captureURL).mockRejectedValue(new Error("Network error"));

      render(<ServerAddTasks aria2={aria2} server={server} extensionOptions={extensionOptions} />);
      const textarea = screen.getByPlaceholderText("addTaskAddUrlsPlaceholder");
      const submitButton = screen.getAllByText("addTaskAdd")[0];

      fireEvent.change(textarea, { target: { value: "http://test.com" } });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(captureURL).toHaveBeenCalled();
      });

      expect(showNotification).not.toHaveBeenCalledWith("addUrlError:TestServer");
    });
  });

  describe("File Form Submission", () => {
    it("does nothing when no files are selected", async () => {
      render(<ServerAddTasks aria2={aria2} server={server} extensionOptions={extensionOptions} />);
      const submitButton = screen.getAllByText("addTaskAdd")[1];

      fireEvent.click(submitButton);

      expect(captureTorrentFromFile).not.toHaveBeenCalled();
      expect(showNotification).not.toHaveBeenCalled();
    });

    it("submits single file successfully", async () => {
      vi.mocked(captureTorrentFromFile).mockResolvedValue({});

      render(<ServerAddTasks aria2={aria2} server={server} extensionOptions={extensionOptions} />);
      const fileInput = screen.getByLabelText("addTaskAddFiles");
      const submitButton = screen.getAllByText("addTaskAdd")[1];
      const file1 = new File(["content1"], "test1.torrent", { type: "application/x-bittorrent" });
      const file2 = new File(["content2"], "test2.torrent", { type: "application/x-bittorrent" });

      fireEvent.change(fileInput, { target: { files: [file1, file2] } });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(captureTorrentFromFile).toHaveBeenNthCalledWith(1, aria2, server, file1);
      });
    });

    it("submits multiple files successfully", async () => {
      vi.mocked(captureTorrentFromFile).mockResolvedValue({});

      render(<ServerAddTasks aria2={aria2} server={server} extensionOptions={extensionOptions} />);
      const fileInput = screen.getByLabelText("addTaskAddFiles");
      const submitButton = screen.getAllByText("addTaskAdd")[1];
      const file1 = new File(["content1"], "test1.torrent", { type: "application/x-bittorrent" });
      const file2 = new File(["content2"], "test2.torrent", { type: "application/x-bittorrent" });

      fireEvent.change(fileInput, { target: { files: [file1, file2] } });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(captureTorrentFromFile).toHaveBeenCalledTimes(2);
        expect(captureTorrentFromFile).toHaveBeenNthCalledWith(1, aria2, server, file1);
        expect(captureTorrentFromFile).toHaveBeenNthCalledWith(2, aria2, server, file2);
      });
    });

    it("handles file submission error", async () => {
      vi.mocked(captureTorrentFromFile).mockRejectedValue(new Error("File error"));

      render(<ServerAddTasks aria2={aria2} server={server} extensionOptions={extensionOptions} />);
      const fileInput = screen.getByLabelText("addTaskAddFiles");
      const submitButton = screen.getAllByText("addTaskAdd")[1];
      const file = new File(["dummy content"], "test.torrent", { type: "application/x-bittorrent" });

      fireEvent.change(fileInput, { target: { files: [file] } });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(showNotification).toHaveBeenCalledWith("addFileError:TestServer");
      });
    });

    it("does not show notification when notifyFileIsAdded is false", async () => {
      vi.spyOn(extensionOptions, "notifyFileIsAdded", "get").mockReturnValue(false);
      vi.mocked(captureTorrentFromFile).mockResolvedValue({});

      render(<ServerAddTasks aria2={aria2} server={server} extensionOptions={extensionOptions} />);
      const fileInput = screen.getByLabelText("addTaskAddFiles");
      const submitButton = screen.getAllByText("addTaskAdd")[1];
      const file = new File(["dummy content"], "test.torrent", { type: "application/x-bittorrent" });

      fireEvent.change(fileInput, { target: { files: [file] } });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(captureTorrentFromFile).toHaveBeenCalled();
      });

      expect(showNotification).not.toHaveBeenCalledWith("addFileSuccess:TestServer");
    });
  });
});
