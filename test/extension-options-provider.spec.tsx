import { render, screen, waitFor } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import browser from "webextension-polyfill";
import { ExtensionOptionsProvider, useExtensionOptions } from "@/extension-options-provider";
import ExtensionOptions from "@/models/extension-options";
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
      <button type="button" onClick={() => setExtensionOptions(extensionOptions.withOverrides({ theme: Theme.Dark }))}>
        Set Dark
      </button>
    </div>
  );
};

describe("extension-options-provider", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  afterEach(() => {
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
      const storedOptions = new ExtensionOptions({}, "https://my-server.com", true);
      vi.mocked(browser.storage.sync.get).mockResolvedValueOnce({
        options: storedOptions.serialize(),
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
      const storedOptions = new ExtensionOptions({}, "", false, 0, [], [], [], false, true, true, true, Theme.Light);
      vi.mocked(browser.storage.sync.get).mockResolvedValueOnce({
        options: storedOptions.serialize(),
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
      const storedOptions = new ExtensionOptions({}, "shared-server", true);
      vi.mocked(browser.storage.sync.get).mockResolvedValueOnce({
        options: storedOptions.serialize(),
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
          <button type="button" onClick={() => setExtensionOptions(new ExtensionOptions())}>
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
