import { describe, expect, it } from "vitest";
import { Task, TaskStatus } from "@/popup/models/task";

const baseTaskData = {
  completedLength: "500",
  connections: "3",
  downloadSpeed: "1024",
  files: [
    {
      completedLength: "500",
      length: "1000",
      path: "",
      uris: [{ uri: "https://example.com/file.zip" }],
    },
  ],
  gid: "abc123",
  status: "active",
  totalLength: "1000",
  uploadLength: "0",
  uploadSpeed: "0",
  dir: "/downloads",
};

describe("Task.parse", () => {
  it("parses valid task data and converts string numbers to numbers", () => {
    const task = Task.parse(baseTaskData);

    expect(task).toBeInstanceOf(Task);
    expect(task.completedLength).toBe(500);
    expect(task.connections).toBe(3);
    expect(task.downloadSpeed).toBe(1024);
    expect(task.totalLength).toBe(1000);
    expect(task.uploadLength).toBe(0);
    expect(task.uploadSpeed).toBe(0);
    expect(task.gid).toBe("abc123");
    expect(task.status).toBe(TaskStatus.Active);
    expect(task.dir).toBe("/downloads");
  });

  it("parses task data with bittorrent info", () => {
    const task = Task.parse({
      ...baseTaskData,
      bittorrent: { info: { name: "my-torrent" } },
    });

    expect(task.bittorrent?.info?.name).toBe("my-torrent");
  });

  it("parses task data without bittorrent info (optional)", () => {
    const task = Task.parse(baseTaskData);

    expect(task.bittorrent).toBeUndefined();
  });

  it("throws on invalid data", () => {
    expect(() => Task.parse({ invalid: "data" })).toThrow();
  });

  it("throws on invalid status value", () => {
    expect(() => Task.parse({ ...baseTaskData, status: "unknown-status" })).toThrow();
  });
});

describe("Task.parseMany", () => {
  it("parses an array of task data objects", () => {
    const tasks = Task.parseMany([
      { ...baseTaskData, gid: "1" },
      { ...baseTaskData, gid: "2", status: "complete" },
    ]);

    expect(tasks).toHaveLength(2);
    expect(tasks[0]).toBeInstanceOf(Task);
    expect(tasks[0].gid).toBe("1");
    expect(tasks[1].gid).toBe("2");
    expect(tasks[1].status).toBe(TaskStatus.Complete);
  });

  it("returns empty array for empty input", () => {
    const tasks = Task.parseMany([]);

    expect(tasks).toHaveLength(0);
  });
});

describe("Task.getFilename", () => {
  it("returns bittorrent info name when bittorrent info is present", () => {
    const task = Task.parse({
      ...baseTaskData,
      bittorrent: { info: { name: "my-torrent" } },
    });

    expect(task.getFilename()).toBe("my-torrent");
  });

  it("returns basename of file path when path is not empty", () => {
    const task = Task.parse({
      ...baseTaskData,
      files: [
        {
          completedLength: "500",
          length: "1000",
          path: "/downloads/archive.zip",
          uris: [{ uri: "https://example.com/archive.zip" }],
        },
      ],
    });

    expect(task.getFilename()).toBe("archive.zip");
  });

  it("returns basename of URI when path is empty", () => {
    const task = Task.parse(baseTaskData);

    expect(task.getFilename()).toBe("file.zip");
  });

  it("returns basename of Windows file path", () => {
    const task = Task.parse({
      ...baseTaskData,
      files: [
        {
          completedLength: "500",
          length: "1000",
          path: "C:\\downloads\\archive.zip",
          uris: [],
        },
      ],
    });

    expect(task.getFilename()).toBe("archive.zip");
  });
});

describe("Task status helpers", () => {
  const statusCases: Array<[string, keyof Task]> = [
    ["active", "isActive"],
    ["complete", "isComplete"],
    ["error", "isError"],
    ["paused", "isPaused"],
    ["removed", "isRemoved"],
    ["waiting", "isWaiting"],
  ];

  for (const [status, method] of statusCases) {
    it(`${method}() returns true when status is "${status}"`, () => {
      const task = Task.parse({ ...baseTaskData, status });

      expect((task[method] as () => boolean)()).toBe(true);
    });

    it(`${method}() returns false when status is not "${status}"`, () => {
      const otherStatus = status === "active" ? "complete" : "active";
      const task = Task.parse({ ...baseTaskData, status: otherStatus });

      expect((task[method] as () => boolean)()).toBe(false);
    });
  }
});
