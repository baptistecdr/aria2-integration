import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import ServerTab from "@/popup/components/server-tab";

vi.mock("@baptistecdr/aria2", () => ({
  default: vi.fn().mockImplementation(() => ({
    call: vi.fn().mockResolvedValue({}),
    multicall: vi.fn().mockResolvedValue([
      [
        /* active */
      ],
      [
        /* waiting */
      ],
      [
        /* stopped */
      ],
    ]),
  })),
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

const extensionOptions = { servers: { s1: { name: "Server1" } } };
const server = { name: "Server1" };

describe("ServerTab", () => {
  const setExtensionOptions = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("shows stats and buttons after loading", async () => {
    render(<ServerTab setExtensionOptions={setExtensionOptions} extensionOptions={extensionOptions as any} server={server as any} />);
    await waitFor(() => expect(screen.getByText(/serverNoTasks/)).toBeInTheDocument());

    expect(screen.getByText(/1 MB\/s/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /serverAdd/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /serverPurge/ })).toBeInTheDocument();
  });

  it("shows ServerAddTasks when Add button is clicked", async () => {
    render(<ServerTab setExtensionOptions={setExtensionOptions} extensionOptions={extensionOptions as any} server={server as any} />);
    await waitFor(() => expect(screen.getByText(/serverNoTasks/)).toBeInTheDocument());

    fireEvent.click(screen.getByRole("button", { name: /serverAdd/ }));

    expect(screen.getByText("ServerAddTasks")).toBeInTheDocument();
  });

  it("shows ServerQuickOptions when gear button is clicked", async () => {
    render(<ServerTab setExtensionOptions={setExtensionOptions} extensionOptions={extensionOptions as any} server={server as any} />);
    await waitFor(() => expect(screen.getByText(/serverNoTasks/)).toBeInTheDocument());

    fireEvent.click(screen.getByRole("button", { name: "quick-options" }));

    expect(screen.getByText("ServerQuickOptions")).toBeInTheDocument();
  });
});
