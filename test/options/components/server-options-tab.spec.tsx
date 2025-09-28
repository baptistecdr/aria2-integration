import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type ExtensionOptions from "@/models/extension-options";
import Server from "@/models/server";
import ServerOptionsTab from "@/options/components/server-options-tab";

vi.mock("@/i18n", () => ({
  default: (key: string) => key,
}));

describe("ServerOptionsTab", () => {
  const server = new Server("test-uuid", "Test Server", true, "localhost", 6800, "/jsonrpc", "secret123", { split: "5" });

  const extensionOptions = {
    addServer: vi.fn().mockResolvedValue({}),
  } as unknown as ExtensionOptions;

  const setExtensionOptions = vi.fn();
  const deleteServer = vi.fn().mockResolvedValue(undefined);

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders with server data", () => {
    render(<ServerOptionsTab extensionOptions={extensionOptions} setExtensionOptions={setExtensionOptions} server={server} deleteServer={deleteServer} />);

    expect(screen.getByLabelText("serverOptionsName")).toHaveValue("Test Server");
    expect(screen.getByLabelText("serverOptionsHost")).toHaveValue("localhost");
    expect(screen.getByLabelText("serverOptionsPort")).toHaveValue(6800);
    expect(screen.getByLabelText("serverOptionsSecureConnection")).toBeChecked();
    expect(screen.getByLabelText("serverOptionsSecret")).toHaveValue("secret123");
    expect(screen.getByLabelText("serverOptionsRpcParameters")).toHaveValue("split: 5");
  });

  it("shows/hides password when toggle button is clicked", async () => {
    render(<ServerOptionsTab extensionOptions={extensionOptions} setExtensionOptions={setExtensionOptions} server={server} deleteServer={deleteServer} />);

    const passwordInput = screen.getByLabelText("serverOptionsSecret");
    const toggleButton = passwordInput.nextElementSibling as HTMLElement;

    expect(passwordInput).toHaveAttribute("type", "password");
    await userEvent.click(toggleButton);
    expect(passwordInput).toHaveAttribute("type", "text");
    await userEvent.click(toggleButton);
    expect(passwordInput).toHaveAttribute("type", "password");
  });

  it("calls addServer when form is submitted with valid data", async () => {
    render(<ServerOptionsTab extensionOptions={extensionOptions} setExtensionOptions={setExtensionOptions} server={server} deleteServer={deleteServer} />);

    await userEvent.clear(screen.getByLabelText("serverOptionsName"));
    await userEvent.type(screen.getByLabelText("serverOptionsName"), "Updated Server");

    await userEvent.clear(screen.getByLabelText("serverOptionsHost"));
    await userEvent.type(screen.getByLabelText("serverOptionsHost"), "127.0.0.1");

    await userEvent.clear(screen.getByLabelText("serverOptionsPort"));
    await userEvent.type(screen.getByLabelText("serverOptionsPort"), "443");

    const secureCheckbox = screen.getByLabelText("serverOptionsSecureConnection");
    await userEvent.click(secureCheckbox);

    await userEvent.clear(screen.getByLabelText("serverOptionsSecret"));
    await userEvent.type(screen.getByLabelText("serverOptionsSecret"), "123secret");

    const saveButton = screen.getByText("serverOptionsSave");
    await userEvent.click(saveButton);

    expect(extensionOptions.addServer).toHaveBeenCalledWith(
      expect.objectContaining({
        name: "Updated Server",
        host: "127.0.0.1",
        port: 443,
        secure: false,
        secret: "123secret",
      }),
    );

    expect(setExtensionOptions).toHaveBeenCalled();
  });

  it("calls deleteServer when delete button is clicked", async () => {
    render(<ServerOptionsTab extensionOptions={extensionOptions} setExtensionOptions={setExtensionOptions} server={server} deleteServer={deleteServer} />);

    const deleteButton = screen.getByText("serverOptionsDelete");
    await userEvent.click(deleteButton);

    expect(deleteServer).toHaveBeenCalledWith(server);
  });

  it("serializes and deserializes RPC parameters correctly", async () => {
    render(<ServerOptionsTab extensionOptions={extensionOptions} setExtensionOptions={setExtensionOptions} server={server} deleteServer={deleteServer} />);

    expect(screen.getByLabelText("serverOptionsRpcParameters")).toHaveValue("split: 5");

    await userEvent.clear(screen.getByLabelText("serverOptionsRpcParameters"));
    await userEvent.type(screen.getByLabelText("serverOptionsRpcParameters"), "split: 5\nproxy: http://localhost:8080");

    const saveButton = screen.getByText("serverOptionsSave");
    await userEvent.click(saveButton);

    expect(extensionOptions.addServer).toHaveBeenCalledWith(
      expect.objectContaining({
        rpcParameters: {
          split: "5",
          proxy: "http://localhost:8080",
        },
      }),
    );
  });

  it("shows error alert when server save fails", async () => {
    const failingExtensionOptions = {
      addServer: vi.fn().mockRejectedValue(new Error("Save failed")),
    } as unknown as ExtensionOptions;

    render(
      <ServerOptionsTab extensionOptions={failingExtensionOptions} setExtensionOptions={setExtensionOptions} server={server} deleteServer={deleteServer} />,
    );

    const saveButton = screen.getByText("serverOptionsSave");
    await userEvent.click(saveButton);

    expect(screen.getByText("serverOptionsError")).toBeInTheDocument();
    expect(setExtensionOptions).not.toHaveBeenCalled();
  });
});
