import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useExtensionOptions } from "@/extension-options-provider";
import type ExtensionOptions from "@/models/extension-options";
import type Server from "@/models/server";
import ServersTabs from "@/popup/components/servers-tabs";

vi.mock("@/extension-options-provider", () => ({
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
      setExtensionOptions: vi.fn(),
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
      setExtensionOptions: vi.fn(),
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
      setExtensionOptions: vi.fn(),
    } as any);

    render(<ServersTabs />);

    await waitFor(() => {
      expect(screen.getByText("ServerTab Server1")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("tab", { name: "Server2" }));

    await waitFor(() => {
      expect(screen.getByText("ServerTab Server2")).toBeInTheDocument();
    });
  });
});
