import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { Server } from "@/domain/server";
import ServerTab from "@/popup/components/server-tab";
import { type Aria2Client, createAria2Client } from "@/services/aria2-client";

vi.mock("@/shared/ui/extension-options-provider", () => ({
  useExtensionOptions: vi.fn(),
}));

vi.mock("@/services/aria2-client", () => ({
  createAria2Client: vi.fn(),
}));

const globalStat = { downloadSpeed: 1048576, uploadSpeed: 1048576, numActive: 0, numWaiting: 0, numStopped: 0, numStoppedTotal: 0 };

function fakeClient(overrides: Partial<Aria2Client> = {}) {
  return {
    getGlobalStat: vi.fn().mockResolvedValue(globalStat),
    getTasks: vi.fn().mockResolvedValue([]),
    purgeDownloadResult: vi.fn().mockResolvedValue("OK"),
    ...overrides,
  } as unknown as Aria2Client;
}
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
  default: ({ task }: any) => <li>ServerTask {task.gid}</li>,
}));

const server = { name: "Server1" };

describe("ServerTab", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(createAria2Client).mockReturnValue(fakeClient());
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

    fireEvent.click(screen.getByRole("button", { name: "Translated: popupQuickOptions" }));

    expect(screen.getByText("ServerQuickOptions")).toBeInTheDocument();
  });

  it("purges the finished downloads when Purge button is clicked", async () => {
    const client = fakeClient();
    vi.mocked(createAria2Client).mockReturnValue(client);
    render(<ServerTab server={server as any} />);
    await waitFor(() => expect(screen.getByText(/Translated: serverNoTasks/)).toBeInTheDocument());
    fireEvent.click(screen.getByRole("button", { name: /Translated: serverPurge/ }));
    expect(client.purgeDownloadResult).toHaveBeenCalled();
  });

  it("shows the tasks of the server", async () => {
    vi.mocked(createAria2Client).mockReturnValue(fakeClient({ getTasks: vi.fn().mockResolvedValue([{ gid: "gid-1" }, { gid: "gid-2" }]) }));

    render(<ServerTab server={server as any} />);

    await waitFor(() => expect(screen.getByText("ServerTask gid-1")).toBeInTheDocument());
    expect(screen.getByText("ServerTask gid-2")).toBeInTheDocument();
  });

  it("shows error message when server call fails", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    vi.mocked(createAria2Client).mockReturnValue(fakeClient({ getGlobalStat: vi.fn().mockRejectedValue(new Error("Connection failed")) }));

    render(<ServerTab server={server as any} />);

    await waitFor(() => expect(screen.getByText(/Translated: serverError/)).toBeInTheDocument());

    expect(screen.queryByText(/Translated: serverNoTasks/)).not.toBeInTheDocument();
  });

  describe("when the server is changed elsewhere while the popup is open", () => {
    const savedServer = Server.create({ uuid: "server-1", name: "Server1", host: "aria2.lan", port: 6800 });

    it("connects to the server with its new settings", async () => {
      const oldClient = fakeClient();
      const newClient = fakeClient();
      vi.mocked(createAria2Client).mockReturnValueOnce(oldClient).mockReturnValueOnce(newClient);
      const { rerender } = render(<ServerTab server={savedServer} />);
      await waitFor(() => expect(oldClient.getGlobalStat).toHaveBeenCalled());

      rerender(<ServerTab server={{ ...savedServer, port: 6801 }} />);

      await waitFor(() => expect(newClient.getGlobalStat).toHaveBeenCalled());
      expect(createAria2Client).toHaveBeenLastCalledWith(expect.objectContaining({ host: "aria2.lan", port: 6801 }));
    });

    it("keeps its connection when only settings it does not use change", async () => {
      const { rerender } = render(<ServerTab server={savedServer} />);
      await waitFor(() => expect(screen.getByText(/Translated: serverNoTasks/)).toBeInTheDocument());

      rerender(<ServerTab server={{ ...savedServer, name: "Renamed", rpcParameters: { split: "5" } }} />);

      expect(createAria2Client).toHaveBeenCalledTimes(1);
    });
  });

  it("tells screen readers which panel the toggle buttons show", async () => {
    render(<ServerTab server={server as any} />);
    await waitFor(() => expect(screen.getByText(/Translated: serverNoTasks/)).toBeInTheDocument());
    const quickOptions = screen.getByRole("button", { name: "Translated: popupQuickOptions" });

    expect(quickOptions).toHaveAttribute("aria-expanded", "false");
    fireEvent.click(quickOptions);
    expect(quickOptions).toHaveAttribute("aria-expanded", "true");
  });

  it("announces the loading state", () => {
    render(<ServerTab server={server as any} />);

    expect(screen.getByRole("status")).toHaveTextContent("Translated: popupLoading");
  });

  it("lists the tasks for screen readers", async () => {
    vi.mocked(createAria2Client).mockReturnValue(fakeClient({ getTasks: vi.fn().mockResolvedValue([{ gid: "gid-1" }, { gid: "gid-2" }]) }));

    render(<ServerTab server={server as any} />);

    await waitFor(() => expect(screen.getByRole("list")).toBeInTheDocument());
  });

  it("announces when the server can't be reached", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    vi.mocked(createAria2Client).mockReturnValue(fakeClient({ getGlobalStat: vi.fn().mockRejectedValue(new Error("Connection failed")) }));

    render(<ServerTab server={server as any} />);

    await waitFor(() => expect(screen.getByRole("status")).toHaveTextContent("Translated: serverError"));
  });
});
