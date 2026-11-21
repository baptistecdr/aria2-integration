import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import browser from "webextension-polyfill";
import { ExtensionOptions } from "@/domain/extension-options";
import Theme from "@/domain/theme";
import { createOptionsStore, type OptionsStore } from "@/services/options-store";
import { ExtensionOptionsProvider, useExtensionOptions } from "@/shared/ui/extension-options-provider";
import { applyTheme } from "@/shared/ui/theme";

vi.mock("@/shared/ui/theme", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/shared/ui/theme")>();
  return {
    ...actual,
    applyTheme: vi.fn(),
  };
});

const ThemeConsumer = () => {
  const { extensionOptions } = useExtensionOptions();
  return <span data-testid="theme">{extensionOptions.theme}</span>;
};

const NoopSetter = () => {
  const { updateExtensionOptions } = useExtensionOptions();
  return (
    <button type="button" onClick={() => updateExtensionOptions((options) => options)}>
      Set
    </button>
  );
};

const CaptureServerConsumer1 = () => {
  const { extensionOptions } = useExtensionOptions();
  return <span data-testid="consumer-1">{extensionOptions.captureServer}</span>;
};

const CaptureServerConsumer2 = () => {
  const { extensionOptions } = useExtensionOptions();
  return <span data-testid="consumer-2">{extensionOptions.captureServer}</span>;
};

const TestConsumer = () => {
  const { extensionOptions } = useExtensionOptions();
  return (
    <div>
      <span data-testid="theme">{extensionOptions.theme}</span>
      <span data-testid="capture-downloads">{String(extensionOptions.captureDownloads)}</span>
      <span data-testid="capture-server">{extensionOptions.captureServer}</span>
    </div>
  );
};

const TestSetter = () => {
  const { extensionOptions, updateExtensionOptions } = useExtensionOptions();
  return (
    <div>
      <span data-testid="theme">{extensionOptions.theme}</span>
      <button type="button" onClick={() => updateExtensionOptions((options) => ExtensionOptions.withOverrides(options, { theme: Theme.Dark }))}>
        Set Dark
      </button>
    </div>
  );
};

describe("extension-options-provider", () => {
  const stores: OptionsStore[] = [];

  // Each test gets its own store, created after the storage mocks are set up.
  const newStore = () => {
    const store = createOptionsStore();
    stores.push(store);
    return store;
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    for (const store of stores.splice(0)) store.dispose();
  });

  describe("ExtensionOptionsProvider", () => {
    it("should render children", async () => {
      vi.mocked(browser.storage.sync.get).mockResolvedValueOnce({});

      render(
        <ExtensionOptionsProvider store={newStore()}>
          <div data-testid="child">Hello</div>
        </ExtensionOptionsProvider>,
      );

      await waitFor(() => expect(screen.getByTestId("child")).toBeInTheDocument());
    });

    it("should load extension options from storage on mount", async () => {
      const storedOptions = ExtensionOptions.create({ captureServer: "https://my-server.com", captureDownloads: true });
      vi.mocked(browser.storage.sync.get).mockResolvedValueOnce({
        options: ExtensionOptions.serialize(storedOptions),
      });

      render(
        <ExtensionOptionsProvider store={newStore()}>
          <TestConsumer />
        </ExtensionOptionsProvider>,
      );

      await waitFor(() => {
        expect(screen.getByTestId("capture-server")).toHaveTextContent("https://my-server.com");
        expect(screen.getByTestId("capture-downloads")).toHaveTextContent("true");
      });
    });

    it("should use default ExtensionOptions when storage is empty", async () => {
      vi.mocked(browser.storage.sync.get).mockResolvedValueOnce({});

      render(
        <ExtensionOptionsProvider store={newStore()}>
          <TestConsumer />
        </ExtensionOptionsProvider>,
      );

      await waitFor(() => {
        expect(screen.getByTestId("theme")).toHaveTextContent(Theme.Auto);
        expect(screen.getByTestId("capture-downloads")).toHaveTextContent("false");
        expect(screen.getByTestId("capture-server")).toHaveTextContent("");
      });
    });

    it("should call applyTheme with default theme on initial render", async () => {
      vi.mocked(browser.storage.sync.get).mockResolvedValueOnce({});

      render(
        <ExtensionOptionsProvider store={newStore()}>
          <TestConsumer />
        </ExtensionOptionsProvider>,
      );

      await waitFor(() => {
        expect(applyTheme).toHaveBeenCalledWith(Theme.Auto);
      });
    });

    it("should call applyTheme when theme changes", async () => {
      vi.mocked(browser.storage.sync.get).mockResolvedValueOnce({});

      const user = userEvent.setup();

      render(
        <ExtensionOptionsProvider store={newStore()}>
          <TestSetter />
        </ExtensionOptionsProvider>,
      );

      await user.click(screen.getByRole("button", { name: "Set Dark" }));

      await waitFor(() => {
        expect(applyTheme).toHaveBeenCalledWith(Theme.Dark);
      });
    });

    it("should apply the stored theme from storage", async () => {
      const storedOptions = ExtensionOptions.create({ theme: Theme.Light });
      vi.mocked(browser.storage.sync.get).mockResolvedValueOnce({
        options: ExtensionOptions.serialize(storedOptions),
      });

      render(
        <ExtensionOptionsProvider store={newStore()}>
          <TestConsumer />
        </ExtensionOptionsProvider>,
      );

      await waitFor(() => {
        expect(screen.getByTestId("theme")).toHaveTextContent(Theme.Light);
        expect(applyTheme).toHaveBeenCalledWith(Theme.Light);
      });
    });

    it("should provide updateExtensionOptions that saves the options and updates the context value", async () => {
      vi.mocked(browser.storage.sync.get).mockResolvedValueOnce({});

      const user = userEvent.setup();

      render(
        <ExtensionOptionsProvider store={newStore()}>
          <TestSetter />
        </ExtensionOptionsProvider>,
      );

      await waitFor(() => {
        expect(screen.getByTestId("theme")).toHaveTextContent(Theme.Auto);
      });

      await user.click(screen.getByRole("button", { name: "Set Dark" }));

      await waitFor(() => {
        expect(screen.getByTestId("theme")).toHaveTextContent(Theme.Dark);
      });
      expect(browser.storage.sync.set).toHaveBeenCalledWith({ options: expect.stringContaining(`"theme":"${Theme.Dark}"`) });
    });

    it("should update the context value when the options are changed elsewhere", async () => {
      vi.mocked(browser.storage.sync.get).mockResolvedValueOnce({});

      render(
        <ExtensionOptionsProvider store={newStore()}>
          <TestConsumer />
        </ExtensionOptionsProvider>,
      );
      await waitFor(() => expect(screen.getByTestId("capture-downloads")).toHaveTextContent("false"));

      // E.g. capture downloads toggled with the keyboard shortcut while the page is open.
      const changedOptions = ExtensionOptions.serialize(ExtensionOptions.create({ captureDownloads: true }));
      vi.mocked(browser.storage.sync.get).mockResolvedValueOnce({ options: changedOptions });
      const onChanged = vi.mocked(browser.storage.onChanged.addListener).mock.calls.at(-1)?.[0] as (changes: object, areaName: string) => void;
      onChanged({ options: { newValue: changedOptions } }, "sync");

      await waitFor(() => expect(screen.getByTestId("capture-downloads")).toHaveTextContent("true"));
    });

    it("should share the same context value across multiple consumers", async () => {
      const storedOptions = ExtensionOptions.create({ captureServer: "shared-server", captureDownloads: true });
      vi.mocked(browser.storage.sync.get).mockResolvedValueOnce({
        options: ExtensionOptions.serialize(storedOptions),
      });

      render(
        <ExtensionOptionsProvider store={newStore()}>
          <CaptureServerConsumer1 />
          <CaptureServerConsumer2 />
        </ExtensionOptionsProvider>,
      );

      await waitFor(() => {
        expect(screen.getByTestId("consumer-1")).toHaveTextContent("shared-server");
        expect(screen.getByTestId("consumer-2")).toHaveTextContent("shared-server");
      });
    });
  });

  describe("useExtensionOptions", () => {
    it("should return default ExtensionOptions when used outside provider", () => {
      render(<ThemeConsumer />);

      expect(screen.getByTestId("theme")).toHaveTextContent(Theme.Auto);
    });

    it("should return a no-op updateExtensionOptions when used outside provider", () => {
      render(<NoopSetter />);

      // Should not throw
      expect(() => screen.getByRole("button", { name: "Set" }).click()).not.toThrow();
    });
  });
});
