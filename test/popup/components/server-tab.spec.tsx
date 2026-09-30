import Aria2 from "@baptistecdr/aria2";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import ServerTab from "@/popup/components/server-tab";

vi.mock("@/extension-options-provider", () => ({
  useExtensionOptions: vi.fn(),
}));

vi.mock("@baptistecdr/aria2", () => ({
  default: vi.fn(function (this: Aria2) {
    this.call = vi.fn().mockResolvedValue({
      downloadSpeed: "1048576",
      uploadSpeed: "1048576",
      numActive: "0",
      numWaiting: "0",
      numStopped: "0",
      numStoppedTotal: "0",
    });
    this.multicall = vi.fn().mockResolvedValue([[], [], []]);
  }),
}));
vi.mock("filesize", () => ({
  filesize: vi.fn(() => "1 MB"),
}));
vi.mock("@/popup/components/server-add-tasks", () => ({
  default: () => <div>ServerAddTasks</div>,
}));
vi.mock("@/popup/components/server-quick-options", () => ({
  default: () => <div>ServerQuickOptions</div>,
}));
vi.mock("@/popup/components/server-task", () => ({
  default: ({ task }: any) => <div>ServerTask {task.gid}</div>,
}));

const server = { name: "Server1" };

describe("ServerTab", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("shows stats and buttons after loading", async () => {
    render(<ServerTab server={server as any} />);
    await waitFor(() => expect(screen.getByText(/Translated: serverNoTasks/)).toBeInTheDocument());

    expect(screen.getByText(/1 MB\/s/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Translated: serverAdd/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Translated: serverPurge/ })).toBeInTheDocument();
  });

  it("shows ServerAddTasks when Add button is clicked", async () => {
    render(<ServerTab server={server as any} />);
    await waitFor(() => expect(screen.getByText(/Translated: serverNoTasks/)).toBeInTheDocument());

    fireEvent.click(screen.getByRole("button", { name: /Translated: serverAdd/ }));

    expect(screen.getByText("ServerAddTasks")).toBeInTheDocument();
  });

  it("shows ServerQuickOptions when gear button is clicked", async () => {
    render(<ServerTab server={server as any} />);
    await waitFor(() => expect(screen.getByText(/Translated: serverNoTasks/)).toBeInTheDocument(), { timeout: 5000 });

    fireEvent.click(screen.getByRole("button", { name: "quick-options" }));

    expect(screen.getByText("ServerQuickOptions")).toBeInTheDocument();
  });

  it("calls aria2.purgeDownloadResult when Purge button is clicked", async () => {
    const mockCall = vi.fn().mockResolvedValue({
      downloadSpeed: "1048576",
      uploadSpeed: "1048576",
      numActive: "0",
      numWaiting: "0",
      numStopped: "0",
      numStoppedTotal: "0",
    });
    vi.mocked(Aria2).mockImplementation(function (this: Aria2) {
      this.call = mockCall;
      this.multicall = vi.fn().mockResolvedValue([[], [], []]);
    });
    render(<ServerTab server={server as any} />);
    await waitFor(() => expect(screen.getByText(/Translated: serverNoTasks/)).toBeInTheDocument());
    fireEvent.click(screen.getByRole("button", { name: /Translated: serverPurge/ }));
    expect(mockCall).toHaveBeenCalledWith("aria2.purgeDownloadResult");
  });

  it("shows error message when server call fails", async () => {
    const mockCall = vi.fn().mockRejectedValue(new Error("Connection failed"));
    const mockMulticall = vi.fn().mockRejectedValue(new Error("Connection failed"));
    vi.mocked(Aria2).mockImplementation(function (this: Aria2) {
      this.call = mockCall;
      this.multicall = mockMulticall;
    });

    render(<ServerTab server={server as any} />);

    await waitFor(() => expect(screen.getByText(/Translated: serverError/)).toBeInTheDocument());

    expect(screen.queryByText(/Translated: serverNoTasks/)).not.toBeInTheDocument();
  });
});
