import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { Server } from "@/domain/server";
import { type Task, TaskStatus } from "@/domain/task";
import ServerTaskManagement from "@/popup/components/server-task-management";
import type { Aria2Client } from "@/services/aria2-client";
import { captureUrl } from "@/services/capture";
import browser from "../../setupTests";

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

function createTask(status: TaskStatus): Task {
  return {
    gid: "test-gid",
    status,
    files: [{ completedLength: 0, length: 0, path: "/downloads/file.txt", uris: [{ uri: "http://test" }] }],
    dir: "/downloads",
  } as Task;
}

describe("ServerTaskManagement", () => {
  it("shows pause button when task is active", () => {
    const task = createTask(TaskStatus.Active);
    render(<ServerTaskManagement server={server} aria2={aria2} task={task} />);
    expect(screen.getByRole("button", { name: /^Translated: task(Pause|Resume|Retry)$/ })).toContainHTML("bi-pause");
  });

  it("shows play button when task is paused", () => {
    const task = createTask(TaskStatus.Paused);
    render(<ServerTaskManagement server={server} aria2={aria2} task={task} />);
    expect(screen.getByRole("button", { name: /^Translated: task(Pause|Resume|Retry)$/ })).toContainHTML("bi-play");
  });

  it("shows retry button when task is error", () => {
    const task = createTask(TaskStatus.Error);
    render(<ServerTaskManagement server={server} aria2={aria2} task={task} />);
    expect(screen.getByRole("button", { name: /^Translated: task(Pause|Resume|Retry)$/ })).toContainHTML("bi-arrow-repeat");
  });

  it("calls aria2.pause when clicking pause", () => {
    const task = createTask(TaskStatus.Active);
    render(<ServerTaskManagement server={server} aria2={aria2} task={task} />);
    fireEvent.click(screen.getByRole("button", { name: /^Translated: task(Pause|Resume|Retry)$/ }));
    expect(aria2.pause).toHaveBeenCalledWith("test-gid");
  });

  it("calls aria2.unpause when clicking play", () => {
    const task = createTask(TaskStatus.Paused);
    render(<ServerTaskManagement server={server} aria2={aria2} task={task} />);
    fireEvent.click(screen.getByRole("button", { name: /^Translated: task(Pause|Resume|Retry)$/ }));
    expect(aria2.unpause).toHaveBeenCalledWith("test-gid");
  });

  it("calls captureUrl when clicking retry", () => {
    const task = createTask(TaskStatus.Error);
    render(<ServerTaskManagement server={server} aria2={aria2} task={task} />);
    fireEvent.click(screen.getByRole("button", { name: /^Translated: task(Pause|Resume|Retry)$/ }));
    expect(captureUrl).toHaveBeenCalledWith(aria2, server, { url: "http://test", incognito: false, directory: "/downloads", filename: "file.txt" });
  });

  it("calls aria2.removeDownloadResult when deleting completed task", () => {
    const task = createTask(TaskStatus.Complete);
    render(<ServerTaskManagement server={server} aria2={aria2} task={task} />);
    fireEvent.click(screen.getByRole("button", { name: "Translated: taskDelete" }));
    expect(aria2.removeDownloadResult).toHaveBeenCalledWith("test-gid");
  });

  it("calls aria2.remove when deleting active task", () => {
    const task = createTask(TaskStatus.Active);
    render(<ServerTaskManagement server={server} aria2={aria2} task={task} />);
    fireEvent.click(screen.getByRole("button", { name: "Translated: taskDelete" }));
    expect(aria2.remove).toHaveBeenCalledWith("test-gid");
  });

  it.each([TaskStatus.Error, TaskStatus.Removed])("calls aria2.removeDownloadResult when deleting a %s task", (status) => {
    render(<ServerTaskManagement server={server} aria2={aria2} task={createTask(status)} />);
    fireEvent.click(screen.getByRole("button", { name: "Translated: taskDelete" }));
    expect(aria2.removeDownloadResult).toHaveBeenCalledWith("test-gid");
  });

  it("calls aria2.remove when deleting a waiting task", () => {
    render(<ServerTaskManagement server={server} aria2={aria2} task={createTask(TaskStatus.Waiting)} />);
    fireEvent.click(screen.getByRole("button", { name: "Translated: taskDelete" }));
    expect(aria2.remove).toHaveBeenCalledWith("test-gid");
  });

  it.each([
    [TaskStatus.Active, "taskPause"],
    [TaskStatus.Paused, "taskResume"],
    [TaskStatus.Error, "taskRetry"],
  ])("names the action button of a %s task after its action and its file", (status, message) => {
    render(<ServerTaskManagement server={server} aria2={aria2} task={createTask(status)} />);

    expect(screen.getByRole("button", { name: `Translated: ${message}` })).toBeInTheDocument();
    expect(browser.i18n.getMessage).toHaveBeenCalledWith(message, "file.txt");
    expect(browser.i18n.getMessage).toHaveBeenCalledWith("taskDelete", "file.txt");
  });

  it("hides the icons of the buttons from screen readers", () => {
    render(<ServerTaskManagement server={server} aria2={aria2} task={createTask(TaskStatus.Active)} />);

    for (const icon of document.querySelectorAll("i.bi")) {
      expect(icon).toHaveAttribute("aria-hidden", "true");
    }
  });
});
