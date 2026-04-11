import { render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import browser from "webextension-polyfill";
import { CurrentTabProvider, findCurrentTab, useCurrentTab } from "@/current-tab-provider";

describe("current-tab-provider", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("findCurrentTab", () => {
    it("should return the active tab from the current window", async () => {
      const mockTab = {
        id: 1,
        windowId: 1,
        url: "https://example.com",
        active: true,
        highlighted: true,
        pinned: false,
      };

      vi.mocked(browser.tabs.query).mockResolvedValueOnce([mockTab] as any);

      const tab = await findCurrentTab();

      expect(browser.tabs.query).toHaveBeenCalledWith({
        currentWindow: true,
        active: true,
      });
      expect(tab).toEqual(mockTab);
    });

    it("should return undefined when no tabs are found", async () => {
      vi.mocked(browser.tabs.query).mockResolvedValueOnce([]);

      const tab = await findCurrentTab();

      expect(tab).toBeUndefined();
    });

    it("should return the first tab when multiple tabs are returned", async () => {
      const mockTab1 = { id: 1, url: "https://example.com", active: true };
      const mockTab2 = { id: 2, url: "https://example2.com", active: true };

      vi.mocked(browser.tabs.query).mockResolvedValueOnce([mockTab1, mockTab2] as any);

      const tab = await findCurrentTab();

      expect(tab).toEqual(mockTab1);
    });

    it("should propagate browser API errors", async () => {
      const error = new Error("Browser API error");
      vi.mocked(browser.tabs.query).mockRejectedValueOnce(error);

      await expect(findCurrentTab()).rejects.toThrow("Browser API error");
    });
  });

  describe("CurrentTabProvider", () => {
    it("should provide undefined tab initially", () => {
      const TestComponent = () => {
        const currentTab = useCurrentTab();
        return <div>{currentTab ? "Tab found" : "No tab"}</div>;
      };

      vi.mocked(browser.tabs.query).mockResolvedValueOnce([]);

      render(
        <CurrentTabProvider>
          <TestComponent />
        </CurrentTabProvider>,
      );

      expect(screen.getByText("No tab")).toBeInTheDocument();
      expect(browser.tabs.query).toHaveBeenCalledTimes(1);
    });

    it("should fetch and provide current tab on mount", async () => {
      const mockTab = {
        id: 1,
        url: "https://example.com",
        active: true,
      };

      vi.mocked(browser.tabs.query).mockResolvedValueOnce([mockTab] as any);

      const TestComponent = () => {
        const currentTab = useCurrentTab();
        return <div>{currentTab?.url || "No tab"}</div>;
      };

      render(
        <CurrentTabProvider>
          <TestComponent />
        </CurrentTabProvider>,
      );

      await waitFor(() => {
        expect(screen.getByText("https://example.com")).toBeInTheDocument();
        expect(browser.tabs.query).toHaveBeenCalledTimes(1);
      });
    });

    it("should handle case when no tabs are available", async () => {
      vi.mocked(browser.tabs.query).mockResolvedValueOnce([]);

      const TestComponent = () => {
        const currentTab = useCurrentTab();
        return <div>{currentTab ? "Tab found" : "No tab"}</div>;
      };

      render(
        <CurrentTabProvider>
          <TestComponent />
        </CurrentTabProvider>,
      );

      await waitFor(() => {
        expect(screen.getByText("No tab")).toBeInTheDocument();
        expect(browser.tabs.query).toHaveBeenCalledTimes(1);
      });
    });
  });

  describe("useCurrentTab", () => {
    it("should return undefined when used outside CurrentTabProvider", () => {
      const TestComponent = () => {
        const currentTab = useCurrentTab();
        return <div>{currentTab ? "Tab found" : "No tab"}</div>;
      };

      render(<TestComponent />);

      expect(screen.getByText("No tab")).toBeInTheDocument();
    });

    it("should return the current tab from context", async () => {
      const mockTab = {
        id: 1,
        url: "https://example.com",
        title: "Example",
        active: true,
        highlighted: true,
        pinned: false,
        incognito: false,
        windowId: 1,
      };

      vi.mocked(browser.tabs.query).mockResolvedValueOnce([mockTab] as any);

      const TestComponent = () => {
        const currentTab = useCurrentTab();
        return (
          <div>
            {currentTab ? (
              <>
                <div>{currentTab.url}</div>
                <div>{currentTab.title}</div>
              </>
            ) : (
              "No tab"
            )}
          </div>
        );
      };

      render(
        <CurrentTabProvider>
          <TestComponent />
        </CurrentTabProvider>,
      );

      await waitFor(() => {
        expect(screen.getByText("https://example.com")).toBeInTheDocument();
        expect(screen.getByText("Example")).toBeInTheDocument();
      });
    });

    it("should provide tab info to multiple consumers", async () => {
      const mockTab = {
        id: 1,
        url: "https://example.com",
        active: true,
      };

      vi.mocked(browser.tabs.query).mockResolvedValueOnce([mockTab] as any);

      const Consumer1 = () => {
        const currentTab = useCurrentTab();
        return <div data-testid="consumer-1">{currentTab?.url || "No tab"}</div>;
      };

      const Consumer2 = () => {
        const currentTab = useCurrentTab();
        return <div data-testid="consumer-2">{currentTab?.id || "No id"}</div>;
      };

      render(
        <CurrentTabProvider>
          <Consumer1 />
          <Consumer2 />
        </CurrentTabProvider>,
      );

      await waitFor(() => {
        expect(screen.getByTestId("consumer-1")).toHaveTextContent("https://example.com");
        expect(screen.getByTestId("consumer-2")).toHaveTextContent("1");
      });
    });

    it("should handle tab with incognito mode", async () => {
      const mockTab = {
        id: 1,
        url: "https://example.com",
        active: true,
        incognito: true,
      };

      vi.mocked(browser.tabs.query).mockResolvedValueOnce([mockTab] as any);

      const TestComponent = () => {
        const currentTab = useCurrentTab();
        return <div>{currentTab?.incognito ? "Incognito" : "Normal"}</div>;
      };

      render(
        <CurrentTabProvider>
          <TestComponent />
        </CurrentTabProvider>,
      );

      await waitFor(() => {
        expect(screen.getByText("Incognito")).toBeInTheDocument();
      });
    });
  });
});
