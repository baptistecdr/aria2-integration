import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { Server } from "@/domain/server";
import type { Task } from "@/domain/task";
import ServerTaskManagement from "@/popup/components/server-task-management";
import type { Aria2Client } from "@/services/aria2-client";
import { captureUrl } from "@/services/capture";

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

const server: Server = { uuid: "server-1" } as Server;

vi.mock("@/services/capture", async () => {
  const actual = await vi.importActual("@/services/capture");
  return {
    ...actual,
    captureUrl: vi.fn(),
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
    expect(aria2.pause).toHaveBeenCalledWith("test-gid");
  });

  it("calls aria2.unpause when clicking play", () => {
    const task = createTask({ isPaused: () => true });
    render(<ServerTaskManagement server={server} aria2={aria2} task={task} />);
    fireEvent.click(screen.getByRole("button", { name: "play-pause-retry" }));
    expect(aria2.unpause).toHaveBeenCalledWith("test-gid");
  });

  it("calls captureUrl when clicking retry", () => {
    const task = createTask({ isError: () => true });
    render(<ServerTaskManagement server={server} aria2={aria2} task={task} />);
    fireEvent.click(screen.getByRole("button", { name: "play-pause-retry" }));
    expect(captureUrl).toHaveBeenCalledWith(aria2, server, { url: "http://test", incognito: false, directory: "/downloads", filename: "file.txt" });
  });

  it("calls aria2.removeDownloadResult when deleting completed task", () => {
    const task = createTask({ isComplete: () => true });
    render(<ServerTaskManagement server={server} aria2={aria2} task={task} />);
    fireEvent.click(screen.getByRole("button", { name: "delete" }));
    expect(aria2.removeDownloadResult).toHaveBeenCalledWith("test-gid");
  });

  it("calls aria2.remove when deleting active task", () => {
    const task = createTask({ isActive: () => true });
    render(<ServerTaskManagement server={server} aria2={aria2} task={task} />);
    fireEvent.click(screen.getByRole("button", { name: "delete" }));
    expect(aria2.remove).toHaveBeenCalledWith("test-gid");
  });
});
