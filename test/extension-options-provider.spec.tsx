import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import browser from "webextension-polyfill";
import { ExtensionOptionsProvider, useExtensionOptions } from "@/extension-options-provider";
import { ExtensionOptions } from "@/models/extension-options";
import Theme, { applyTheme } from "@/models/theme";

vi.mock("@/models/theme", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/models/theme")>();
  return {
    ...actual,
    applyTheme: vi.fn(),
  };
});

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
  const { extensionOptions, setExtensionOptions } = useExtensionOptions();
  return (
    <div>
      <span data-testid="theme">{extensionOptions.theme}</span>
      <button type="button" onClick={() => setExtensionOptions(ExtensionOptions.withOverrides(extensionOptions, { theme: Theme.Dark }))}>
        Set Dark
      </button>
    </div>
  );
};

describe("extension-options-provider", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("ExtensionOptionsProvider", () => {
    it("should render children", async () => {
      vi.mocked(browser.storage.sync.get).mockResolvedValueOnce({});

      render(
        <ExtensionOptionsProvider>
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
        <ExtensionOptionsProvider>
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
        <ExtensionOptionsProvider>
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
        <ExtensionOptionsProvider>
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
        <ExtensionOptionsProvider>
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
        <ExtensionOptionsProvider>
          <TestConsumer />
        </ExtensionOptionsProvider>,
      );

      await waitFor(() => {
        expect(screen.getByTestId("theme")).toHaveTextContent(Theme.Light);
        expect(applyTheme).toHaveBeenCalledWith(Theme.Light);
      });
    });

    it("should provide setExtensionOptions that updates the context value", async () => {
      vi.mocked(browser.storage.sync.get).mockResolvedValueOnce({});

      const user = userEvent.setup();

      render(
        <ExtensionOptionsProvider>
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
    });

    it("should share the same context value across multiple consumers", async () => {
      const storedOptions = ExtensionOptions.create({ captureServer: "shared-server", captureDownloads: true });
      vi.mocked(browser.storage.sync.get).mockResolvedValueOnce({
        options: ExtensionOptions.serialize(storedOptions),
      });

      const Consumer1 = () => {
        const { extensionOptions } = useExtensionOptions();
        return <span data-testid="consumer-1">{extensionOptions.captureServer}</span>;
      };
      const Consumer2 = () => {
        const { extensionOptions } = useExtensionOptions();
        return <span data-testid="consumer-2">{extensionOptions.captureServer}</span>;
      };

      render(
        <ExtensionOptionsProvider>
          <Consumer1 />
          <Consumer2 />
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
      const TestOutsideProvider = () => {
        const { extensionOptions } = useExtensionOptions();
        return <span data-testid="theme">{extensionOptions.theme}</span>;
      };

      render(<TestOutsideProvider />);

      expect(screen.getByTestId("theme")).toHaveTextContent(Theme.Auto);
    });

    it("should return a no-op setExtensionOptions when used outside provider", () => {
      const TestOutsideProvider = () => {
        const { setExtensionOptions } = useExtensionOptions();
        return (
          <button type="button" onClick={() => setExtensionOptions(ExtensionOptions.create())}>
            Set
          </button>
        );
      };

      render(<TestOutsideProvider />);

      // Should not throw
      expect(() => screen.getByRole("button", { name: "Set" }).click()).not.toThrow();
    });
  });
});
