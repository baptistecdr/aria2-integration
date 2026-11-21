import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ExtensionOptions } from "@/domain/extension-options";
import type { Server } from "@/domain/server";
import ServersTabs from "@/popup/components/servers-tabs";
import { useExtensionOptions } from "@/shared/ui/extension-options-provider";

vi.mock("@/shared/ui/extension-options-provider", () => ({
  useExtensionOptions: vi.fn(),
}));

vi.mock("@/popup/components/server-tab", () => ({
  default: ({ server }: any) => <div>ServerTab {server.name}</div>,
}));

describe("ServersTabs", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("shows no server message when no servers", () => {
    vi.mocked(useExtensionOptions).mockReturnValue({
      extensionOptions: {
        servers: {},
      } as ExtensionOptions,
      updateExtensionOptions: vi.fn(),
      managedOptions: new Set(),
    } as any);

    render(<ServersTabs />);

    expect(screen.getByText(/popupNoServerFound1/)).toBeInTheDocument();
    expect(screen.getByText(/popupNoServerFound2/)).toBeInTheDocument();
  });

  it("renders tabs for servers and ServerTab for each", async () => {
    const servers = {
      s1: { name: "Server1" },
      s2: { name: "Server2" },
    } as unknown as Record<string, Server>;

    vi.mocked(useExtensionOptions).mockReturnValue({
      extensionOptions: {
        servers,
      } as ExtensionOptions,
      updateExtensionOptions: vi.fn(),
      managedOptions: new Set(),
    } as any);

    render(<ServersTabs />);

    await waitFor(() => {
      expect(screen.getByText("ServerTab Server1")).toBeInTheDocument();
      expect(screen.getByRole("tab", { name: "Server1" })).toBeInTheDocument();
      expect(screen.getByRole("tab", { name: "Server2" })).toBeInTheDocument();
    });
  });

  it("switches active tab on tab click", async () => {
    const servers = {
      s1: { name: "Server1" },
      s2: { name: "Server2" },
    } as unknown as Record<string, Server>;

    vi.mocked(useExtensionOptions).mockReturnValue({
      extensionOptions: {
        servers,
      } as ExtensionOptions,
      updateExtensionOptions: vi.fn(),
      managedOptions: new Set(),
    } as any);

    render(<ServersTabs />);

    await waitFor(() => {
      expect(screen.getByText("ServerTab Server1")).toBeInTheDocument();
    });

    await userEvent.click(screen.getByRole("tab", { name: "Server2" }));

    await waitFor(() => {
      expect(screen.getByText("ServerTab Server2")).toBeInTheDocument();
    });
  });

  // Every options change (quick options, keyboard shortcut, options page) creates a new servers object.
  it("keeps the selected tab when the options change", async () => {
    const mockOptions = (servers: Record<string, Server>) =>
      vi.mocked(useExtensionOptions).mockReturnValue({
        extensionOptions: { servers } as ExtensionOptions,
        updateExtensionOptions: vi.fn(),
        managedOptions: new Set(),
      } as any);
    const servers = { s1: { name: "Server1" }, s2: { name: "Server2" } } as unknown as Record<string, Server>;
    mockOptions(servers);
    const { rerender } = render(<ServersTabs />);
    await userEvent.click(screen.getByRole("tab", { name: "Server2" }));

    mockOptions({ ...servers });
    rerender(<ServersTabs />);

    await waitFor(() => {
      expect(screen.getByRole("tab", { name: "Server2" })).toHaveAttribute("aria-selected", "true");
      expect(screen.getByText("ServerTab Server2")).toBeInTheDocument();
    });
  });

  it("selects the first server when the selected one is deleted", async () => {
    const mockOptions = (servers: Record<string, Server>) =>
      vi.mocked(useExtensionOptions).mockReturnValue({
        extensionOptions: { servers } as ExtensionOptions,
        updateExtensionOptions: vi.fn(),
        managedOptions: new Set(),
      } as any);
    mockOptions({ s1: { name: "Server1" }, s2: { name: "Server2" } } as unknown as Record<string, Server>);
    const { rerender } = render(<ServersTabs />);
    await userEvent.click(screen.getByRole("tab", { name: "Server2" }));

    mockOptions({ s1: { name: "Server1" } } as unknown as Record<string, Server>);
    rerender(<ServersTabs />);

    await waitFor(() => {
      expect(screen.getByRole("tab", { name: "Server1" })).toHaveAttribute("aria-selected", "true");
      expect(screen.getByText("ServerTab Server1")).toBeInTheDocument();
    });
  });

  it("selects the first server once the options are loaded", async () => {
    const mockOptions = (servers: Record<string, Server>) =>
      vi.mocked(useExtensionOptions).mockReturnValue({
        extensionOptions: { servers } as ExtensionOptions,
        updateExtensionOptions: vi.fn(),
        managedOptions: new Set(),
      } as any);
    mockOptions({});
    const { rerender } = render(<ServersTabs />);

    mockOptions({ s1: { name: "Server1" }, s2: { name: "Server2" } } as unknown as Record<string, Server>);
    rerender(<ServersTabs />);

    await waitFor(() => {
      expect(screen.getByRole("tab", { name: "Server1" })).toHaveAttribute("aria-selected", "true");
      expect(screen.getByText("ServerTab Server1")).toBeInTheDocument();
    });
  });
});
