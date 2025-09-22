import { fireEvent, render, screen } from "@testing-library/react";
import { expect, vi } from "vitest";
import { captureURL } from "@/models/aria2-extension.ts";
import type Server from "@/models/server";
import ServerTaskManagement from "@/popup/components/server-task-management";
import type { Task } from "@/popup/models/task";

const aria2 = { call: vi.fn() };
const server: Server = { uuid: "server-1" } as Server;

vi.mock("@/models/aria2-extension", async () => {
  const actual = await vi.importActual("@/models/aria2-extension");
  return {
    ...actual,
    captureURL: vi.fn(),
  };
});

function createTask(overrides: Partial<Task>): Task {
  return {
    gid: "test-gid",
    files: [{ uris: [{ uri: "http://test" }] }],
    dir: "/downloads",
    getFilename: () => "file.txt",
    isActive: () => false,
    isPaused: () => false,
    isError: () => false,
    isComplete: () => false,
    isRemoved: () => false,
    ...overrides,
  } as Task;
}

describe("ServerTaskManagement", () => {
  beforeEach(() => {
    aria2.call.mockClear();
  });

  it("shows pause button when task is active", () => {
    const task = createTask({ isActive: () => true });
    render(<ServerTaskManagement server={server} aria2={aria2} task={task} />);
    expect(screen.getByRole("button", { name: "play-pause-retry" })).toContainHTML("bi-pause");
  });

  it("shows play button when task is paused", () => {
    const task = createTask({ isPaused: () => true });
    render(<ServerTaskManagement server={server} aria2={aria2} task={task} />);
    expect(screen.getByRole("button", { name: "play-pause-retry" })).toContainHTML("bi-play");
  });

  it("shows retry button when task is error", () => {
    const task = createTask({ isError: () => true });
    render(<ServerTaskManagement server={server} aria2={aria2} task={task} />);
    expect(screen.getByRole("button", { name: "play-pause-retry" })).toContainHTML("bi-arrow-repeat");
  });

  it("calls aria2.pause when clicking pause", () => {
    const task = createTask({ isActive: () => true });
    render(<ServerTaskManagement server={server} aria2={aria2} task={task} />);
    fireEvent.click(screen.getByRole("button", { name: "play-pause-retry" }));
    expect(aria2.call).toHaveBeenCalledWith("aria2.pause", "test-gid");
  });

  it("calls aria2.unpause when clicking play", () => {
    const task = createTask({ isPaused: () => true });
    render(<ServerTaskManagement server={server} aria2={aria2} task={task} />);
    fireEvent.click(screen.getByRole("button", { name: "play-pause-retry" }));
    expect(aria2.call).toHaveBeenCalledWith("aria2.unpause", "test-gid");
  });

  it("calls captureURL when clicking retry", () => {
    const task = createTask({ isError: () => true });
    render(<ServerTaskManagement server={server} aria2={aria2} task={task} />);
    fireEvent.click(screen.getByRole("button", { name: "play-pause-retry" }));
    expect(captureURL).toHaveBeenCalledWith(aria2, server, "http://test", "", "", "/downloads", "file.txt");
  });

  it("calls aria2.removeDownloadResult when deleting completed task", () => {
    const task = createTask({ isComplete: () => true });
    render(<ServerTaskManagement server={server} aria2={aria2} task={task} />);
    fireEvent.click(screen.getByRole("button", { name: "delete" }));
    expect(aria2.call).toHaveBeenCalledWith("aria2.removeDownloadResult", "test-gid");
  });

  it("calls aria2.remove when deleting active task", () => {
    const task = createTask({ isActive: () => true });
    render(<ServerTaskManagement server={server} aria2={aria2} task={task} />);
    fireEvent.click(screen.getByRole("button", { name: "delete" }));
    expect(aria2.call).toHaveBeenCalledWith("aria2.remove", "test-gid");
  });
});
