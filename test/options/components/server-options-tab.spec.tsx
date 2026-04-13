import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useExtensionOptions } from "@/extension-options-provider";
import type ExtensionOptions from "@/models/extension-options";
import Server from "@/models/server";
import ServerIncognitoModeOptions from "@/models/server-incognito-mode-options";
import ServerOptionsTab from "@/options/components/server-options-tab";

vi.mock("@/i18n", () => ({
  default: (key: string) => key,
}));

vi.mock("@/extension-options-provider", () => ({
  useExtensionOptions: vi.fn(),
  setExtensionOptions: vi.fn(),
}));

describe("ServerOptionsTab", () => {
  const addServer = vi.fn();
  const extensionOptions = {
    addServer,
  } as unknown as ExtensionOptions;
  const setExtensionOptions = vi.fn();
  const server = new Server(
    "test-uuid",
    "Test Server",
    true,
    "localhost",
    6800,
    "/jsonrpc",
    "secret123",
    { split: "5" },
    new ServerIncognitoModeOptions(true, true, { split: "6" }),
  );
  const deleteServer = vi.fn().mockResolvedValue(undefined);

  beforeEach(() => {
    vi.clearAllMocks();

    vi.mocked(useExtensionOptions).mockReturnValue({
      extensionOptions,
      setExtensionOptions,
    } as any);
  });

  it("renders with server data", async () => {
    render(<ServerOptionsTab server={server} deleteServer={deleteServer} />);

    expect(screen.getByLabelText("serverOptionsName")).toHaveValue("Test Server");
    expect(screen.getByLabelText("serverOptionsHost")).toHaveValue("localhost");
    expect(screen.getByLabelText("serverOptionsPort")).toHaveValue(6800);
    expect(screen.getByLabelText("serverOptionsSecureConnection")).toBeChecked();
    expect(screen.getByLabelText("serverOptionsUrl")).toHaveValue("https://localhost:6800/jsonrpc");
    expect(screen.getByLabelText("serverOptionsSecret")).toHaveValue("secret123");
    const serverOptionsRpcParameters = await screen.findAllByLabelText("serverOptionsRpcParameters");
    expect(screen.getByLabelText("serverOptionsAutomaticallyPurgeDownloads")).toBeChecked();
    expect(screen.getByLabelText("serverOptionsOverwriteRpcParameters")).toBeChecked();
    expect(serverOptionsRpcParameters).toHaveLength(2);
    expect(serverOptionsRpcParameters[0]).toHaveValue("split: 5");
    expect(serverOptionsRpcParameters[1]).toHaveValue("split: 6");
  });

  it("shows/hides password when toggle button is clicked", async () => {
    render(<ServerOptionsTab server={server} deleteServer={deleteServer} />);

    const passwordInput = screen.getByLabelText("serverOptionsSecret");
    const toggleButton = passwordInput.nextElementSibling as HTMLElement;

    expect(passwordInput).toHaveAttribute("type", "password");
    await userEvent.click(toggleButton);
    expect(passwordInput).toHaveAttribute("type", "text");
    await userEvent.click(toggleButton);
    expect(passwordInput).toHaveAttribute("type", "password");
  });

  it("calls addServer when form is submitted with valid data", async () => {
    render(<ServerOptionsTab server={server} deleteServer={deleteServer} />);

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

    expect(addServer).toHaveBeenCalledWith(
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
    render(<ServerOptionsTab server={server} deleteServer={deleteServer} />);

    const deleteButton = screen.getByText("serverOptionsDelete");
    await userEvent.click(deleteButton);

    expect(deleteServer).toHaveBeenCalledWith(server);
  });

  it("serializes and deserializes RPC parameters correctly", async () => {
    render(<ServerOptionsTab server={server} deleteServer={deleteServer} />);

    const serverOptionsRpcParameters = await screen.findAllByLabelText("serverOptionsRpcParameters");

    expect(serverOptionsRpcParameters).toHaveLength(2);
    expect(serverOptionsRpcParameters[0]).toHaveValue("split: 5");
    expect(serverOptionsRpcParameters[1]).toHaveValue("split: 6");

    await userEvent.clear(serverOptionsRpcParameters[0]);
    await userEvent.type(serverOptionsRpcParameters[0], "split: 5\nproxy: http://localhost:8080");

    await userEvent.clear(serverOptionsRpcParameters[1]);
    await userEvent.type(serverOptionsRpcParameters[1], "split: 6\nproxy: http://localhost:8081");

    const saveButton = screen.getByText("serverOptionsSave");
    await userEvent.click(saveButton);

    expect(addServer).toHaveBeenCalledWith(
      expect.objectContaining({
        rpcParameters: {
          split: "5",
          proxy: "http://localhost:8080",
        },
        incognitoModeOptions: new ServerIncognitoModeOptions(true, true, {
          split: "6",
          proxy: "http://localhost:8081",
        }),
      }),
    );
  });

  it("shows error alert when server save fails", async () => {
    addServer.mockRejectedValueOnce(new Error("Save failed"));

    render(<ServerOptionsTab server={server} deleteServer={deleteServer} />);

    const saveButton = screen.getByText("serverOptionsSave");
    await userEvent.click(saveButton);

    expect(screen.getByText("serverOptionsError")).toBeInTheDocument();
    expect(setExtensionOptions).not.toHaveBeenCalled();
  });

  it("shows empty URL when server host is empty", async () => {
    render(<ServerOptionsTab server={server} deleteServer={deleteServer} />);

    await userEvent.clear(screen.getByLabelText("serverOptionsHost"));

    expect(screen.getByLabelText("serverOptionsUrl")).toHaveValue("");
  });

  it("incognito RPC parameters textarea is enabled when overwriteRpcParameters is true", () => {
    const serverWithOverwrite = new Server(
      "test-uuid",
      "Test Server",
      true,
      "localhost",
      6800,
      "/jsonrpc",
      "secret123",
      { split: "5" },
      new ServerIncognitoModeOptions(false, true, { split: "6" }),
    );

    render(<ServerOptionsTab server={serverWithOverwrite} deleteServer={deleteServer} />);

    const overwriteCheckbox = screen.getByLabelText("serverOptionsOverwriteRpcParameters");
    expect(overwriteCheckbox).toBeChecked();

    const allRpcTextareas = screen.getAllByLabelText("serverOptionsRpcParameters");
    const incognitoRpcTextarea = allRpcTextareas[1];
    expect(incognitoRpcTextarea).toBeEnabled();
  });

  it("incognito RPC parameters textarea is disabled when overwriteRpcParameters is false", () => {
    const serverWithoutOverwrite = new Server(
      "test-uuid",
      "Test Server",
      true,
      "localhost",
      6800,
      "/jsonrpc",
      "secret123",
      { split: "5" },
      new ServerIncognitoModeOptions(false, false, { split: "6" }),
    );

    render(<ServerOptionsTab server={serverWithoutOverwrite} deleteServer={deleteServer} />);

    const overwriteCheckbox = screen.getByLabelText("serverOptionsOverwriteRpcParameters");
    expect(overwriteCheckbox).not.toBeChecked();

    const allRpcTextareas = screen.getAllByLabelText("serverOptionsRpcParameters");
    const incognitoRpcTextarea = allRpcTextareas[1];
    expect(incognitoRpcTextarea).toBeDisabled();
  });

  it("enables incognito RPC parameters textarea when overwriteRpcParameters checkbox is checked", async () => {
    const serverWithoutOverwrite = new Server(
      "test-uuid",
      "Test Server",
      true,
      "localhost",
      6800,
      "/jsonrpc",
      "secret123",
      { split: "5" },
      new ServerIncognitoModeOptions(false, false, {}),
    );

    render(<ServerOptionsTab server={serverWithoutOverwrite} deleteServer={deleteServer} />);

    const allRpcTextareas = screen.getAllByLabelText("serverOptionsRpcParameters");
    const incognitoRpcTextarea = allRpcTextareas[1];
    expect(incognitoRpcTextarea).toBeDisabled();

    const overwriteCheckbox = screen.getByLabelText("serverOptionsOverwriteRpcParameters");
    await userEvent.click(overwriteCheckbox);

    expect(incognitoRpcTextarea).toBeEnabled();
  });

  it("disables incognito RPC parameters textarea when overwriteRpcParameters checkbox is unchecked", async () => {
    render(<ServerOptionsTab server={server} deleteServer={deleteServer} />);

    const allRpcTextareas = screen.getAllByLabelText("serverOptionsRpcParameters");
    const incognitoRpcTextarea = allRpcTextareas[1];
    expect(incognitoRpcTextarea).toBeEnabled();

    const overwriteCheckbox = screen.getByLabelText("serverOptionsOverwriteRpcParameters");
    await userEvent.click(overwriteCheckbox);

    expect(incognitoRpcTextarea).toBeDisabled();
  });

  it("saves overwriteRpcParameters as false when checkbox is unchecked before submit", async () => {
    render(<ServerOptionsTab server={server} deleteServer={deleteServer} />);

    const overwriteCheckbox = screen.getByLabelText("serverOptionsOverwriteRpcParameters");
    await userEvent.click(overwriteCheckbox);

    const saveButton = screen.getByText("serverOptionsSave");
    await userEvent.click(saveButton);

    expect(addServer).toHaveBeenCalledWith(
      expect.objectContaining({
        incognitoModeOptions: new ServerIncognitoModeOptions(true, false, { split: "6" }),
      }),
    );
  });

  it("saves overwriteRpcParameters as true when checkbox is checked before submit", async () => {
    const serverWithoutOverwrite = new Server(
      "test-uuid",
      "Test Server",
      true,
      "localhost",
      6800,
      "/jsonrpc",
      "secret123",
      { split: "5" },
      new ServerIncognitoModeOptions(false, false, {}),
    );

    render(<ServerOptionsTab server={serverWithoutOverwrite} deleteServer={deleteServer} />);

    const overwriteCheckbox = screen.getByLabelText("serverOptionsOverwriteRpcParameters");
    await userEvent.click(overwriteCheckbox);

    const allRpcTextareas = screen.getAllByLabelText("serverOptionsRpcParameters");
    const incognitoRpcTextarea = allRpcTextareas[1];
    await userEvent.type(incognitoRpcTextarea, "split: 3");

    const saveButton = screen.getByText("serverOptionsSave");
    await userEvent.click(saveButton);

    expect(addServer).toHaveBeenCalledWith(
      expect.objectContaining({
        incognitoModeOptions: new ServerIncognitoModeOptions(false, true, { split: "3" }),
      }),
    );
  });
});
