import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Server } from "@/domain/server";
import { type Task, TaskStatus } from "@/domain/task";
import ServerTask from "@/popup/components/server-task";
import type { Aria2Client } from "@/services/aria2-client";
import browser from "../../setupTests";

vi.mock("@/popup/components/server-task-management", () => ({
  default: () => <div data-testid="task-management">Task Management</div>,
}));

// A fake aria2 client: every method resolves.
const aria2 = {
  addUri: vi.fn(),
  addTorrent: vi.fn(),
  addMetalink: vi.fn(),
  pause: vi.fn().mockResolvedValue("OK"),
  unpause: vi.fn().mockResolvedValue("OK"),
  remove: vi.fn().mockResolvedValue("OK"),
  removeDownloadResult: vi.fn().mockResolvedValue("OK"),
  purgeDownloadResult: vi.fn().mockResolvedValue("OK"),
  getGlobalStat: vi.fn(),
  getTasks: vi.fn(),
} satisfies Aria2Client;

describe("ServerTask", () => {
  const server: Server = {
    uuid: "test-uuid",
    name: "Test Server",
    rpcParameters: {},
  } as Server;
  let task: Task;

  beforeEach(() => {
    task = {
      gid: "123",
      status: TaskStatus.Active,
      completedLength: 50000000,
      totalLength: 100000000,
      downloadSpeed: 1000000,
      uploadSpeed: 10000,
      connections: 1337,
      uploadLength: 0,
      dir: "/downloads",
      files: [{ completedLength: 50000000, length: 100000000, path: "/downloads/test-file.mp4", uris: [] }],
    } as Task;
  });

  it("renders active task correctly", () => {
    render(<ServerTask server={server} aria2={aria2} task={task} />);

    expect(screen.getByText("test-file.mp4")).toBeInTheDocument();

    expect(screen.getByText(/taskStatusActive/)).toBeInTheDocument();
    expect(screen.getByText(/47.68 MiB/)).toBeInTheDocument(); // Completed size
    expect(screen.getByText(/95.37 MiB/)).toBeInTheDocument(); // Total size

    expect(screen.getByText(/1337/)).toBeInTheDocument(); // Connections
    expect(screen.getByText(/taskConnections/)).toBeInTheDocument();
    expect(screen.getByText(/976.56 KiB\/s/)).toBeInTheDocument(); // Download speed
    expect(screen.getByText(/9.77 KiB\/s/)).toBeInTheDocument(); // Upload speed

    expect(screen.getByText("50 %")).toBeInTheDocument(); // Progress percentage

    expect(screen.getByTestId("task-management")).toBeInTheDocument();
  });

  it("renders completed task correctly", () => {
    task.status = TaskStatus.Complete;
    task.completedLength = task.totalLength;

    render(<ServerTask server={server} aria2={aria2} task={task} />);

    expect(screen.getByText(/taskStatusComplete/)).toBeInTheDocument();
    expect(screen.queryByText(/∞/)).not.toBeInTheDocument(); // ETA isn't shown for completed tasks

    const progressBar = document.querySelector(".bg-success");
    expect(progressBar).toBeInTheDocument();
    expect(screen.getByText("100 %")).toBeInTheDocument();
  });

  it("renders paused task correctly", () => {
    task.status = TaskStatus.Paused;

    render(<ServerTask server={server} aria2={aria2} task={task} />);

    expect(screen.getByText(/taskStatusPaused/)).toBeInTheDocument();
    expect(screen.queryByText(/connections/i)).not.toBeInTheDocument(); // No connections shown for paused

    const progressBar = document.querySelector(".bg-warning");
    expect(progressBar).toBeInTheDocument();
  });

  it("renders error task correctly", () => {
    task.status = TaskStatus.Error;

    render(<ServerTask server={server} aria2={aria2} task={task} />);

    expect(screen.getByText(/taskStatusError/)).toBeInTheDocument();

    const progressBar = document.querySelector(".bg-danger");
    expect(progressBar).toBeInTheDocument();
  });

  it("shows infinite ETA when download speed is zero", () => {
    task.downloadSpeed = 0;

    render(<ServerTask server={server} aria2={aria2} task={task} />);

    expect(screen.getByText(/∞/)).toBeInTheDocument();
  });

  it("formats ETA correctly", () => {
    // Set speed so that ETA is exactly 50 seconds
    task.downloadSpeed = (task.totalLength - task.completedLength) / 50;

    render(<ServerTask server={server} aria2={aria2} task={task} />);

    expect(screen.getByText(/00:00:50/)).toBeInTheDocument();
  });

  it("names the progress bar after the file and gives its percentage", () => {
    render(<ServerTask server={server} aria2={aria2} task={task} />);

    const progressBar = screen.getByRole("progressbar", { name: "Translated: taskProgress" });
    expect(progressBar).toHaveAttribute("aria-valuenow", "50");
    expect(progressBar).toHaveAttribute("aria-valuemax", "100");
    expect(browser.i18n.getMessage).toHaveBeenCalledWith("taskProgress", "test-file.mp4");
  });

  it("names the speeds for screen readers", () => {
    render(<ServerTask server={server} aria2={aria2} task={task} />);

    expect(screen.getByText("Translated: popupDownloadSpeed")).toHaveClass("visually-hidden");
    expect(screen.getByText("Translated: popupUploadSpeed")).toHaveClass("visually-hidden");
  });
});
