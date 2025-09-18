import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type Server from "@/models/server.ts";
import ServerTask from "@/popup/components/server-task.tsx";
import { type Task, TaskStatus } from "@/popup/models/task.ts";

vi.mock("@/popup/components/server-task-management", () => ({
  default: () => <div data-testid="task-management">Task Management</div>,
}));

describe("ServerTask", () => {
  const server: Server = {
    uuid: "test-uuid",
    name: "Test Server",
    rpcParameters: {},
  } as Server;
  const aria2 = {
    call: vi.fn(),
  };
  let task: Task;

  beforeEach(() => {
    task = {
      gid: "123",
      status: "active",
      completedLength: 50000000,
      totalLength: 100000000,
      downloadSpeed: 1000000,
      uploadSpeed: 10000,
      connections: 1337,
      isActive: vi.fn().mockReturnValue(true),
      isComplete: vi.fn().mockReturnValue(false),
      isError: vi.fn().mockReturnValue(false),
      isRemoved: vi.fn().mockReturnValue(false),
      isPaused: vi.fn().mockReturnValue(false),
      isWaiting: vi.fn().mockReturnValue(false),
      getFilename: vi.fn().mockReturnValue("test-file.mp4"),
    } as unknown as Task;
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
    task.isActive = vi.fn().mockReturnValue(false);
    task.isComplete = vi.fn().mockReturnValue(true);
    task.completedLength = task.totalLength;

    render(<ServerTask server={server} aria2={aria2} task={task} />);

    expect(screen.getByText(/taskStatusComplete/)).toBeInTheDocument();
    expect(screen.queryByText(/∞/)).not.toBeInTheDocument(); // ETA not shown for completed tasks

    const progressBar = document.querySelector(".bg-success");
    expect(progressBar).toBeInTheDocument();
    expect(screen.getByText("100 %")).toBeInTheDocument();
  });

  it("renders paused task correctly", () => {
    task.status = TaskStatus.Paused;
    task.isActive = vi.fn().mockReturnValue(false);
    task.isPaused = vi.fn().mockReturnValue(true);

    render(<ServerTask server={server} aria2={aria2} task={task} />);

    expect(screen.getByText(/taskStatusPaused/)).toBeInTheDocument();
    expect(screen.queryByText(/connections/i)).not.toBeInTheDocument(); // No connections shown for paused

    const progressBar = document.querySelector(".bg-warning");
    expect(progressBar).toBeInTheDocument();
  });

  it("renders error task correctly", () => {
    task.status = TaskStatus.Error;
    task.isActive = vi.fn().mockReturnValue(false);
    task.isError = vi.fn().mockReturnValue(true);

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
});
