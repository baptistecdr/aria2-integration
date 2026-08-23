import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import Theme, { applyTheme } from "@/models/theme";

describe("Apply Theme", () => {
  const originalDocumentElement = document.documentElement;
  let mockDocumentElement: Partial<HTMLElement>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockDocumentElement = {
      setAttribute: vi.fn(),
    };
    Object.defineProperty(document, "documentElement", {
      value: mockDocumentElement,
      writable: true,
    });
  });

  afterEach(() => {
    Object.defineProperty(document, "documentElement", {
      value: originalDocumentElement,
      writable: true,
    });
  });

  it("applies light theme when Theme.Light is passed", () => {
    applyTheme(Theme.Light);

    expect(mockDocumentElement.setAttribute).toHaveBeenCalledWith("data-bs-theme", "light");
  });

  it("applies dark theme when Theme.Dark is passed", () => {
    applyTheme(Theme.Dark);

    expect(mockDocumentElement.setAttribute).toHaveBeenCalledWith("data-bs-theme", "dark");
  });

  it("applies dark theme when Theme.Auto is passed and system prefers dark", () => {
    vi.stubGlobal(
      "matchMedia",
      vi.fn().mockImplementation((query) => ({
        matches: query === "(prefers-color-scheme: dark)",
        media: query,
      })),
    );

    applyTheme(Theme.Auto);

    expect(mockDocumentElement.setAttribute).toHaveBeenCalledWith("data-bs-theme", "dark");
  });

  it("applies light theme when Theme.Auto is passed and system prefers light", () => {
    vi.stubGlobal(
      "matchMedia",
      vi.fn().mockImplementation((query) => ({
        matches: query === "(prefers-color-scheme: light)",
        media: query,
      })),
    );

    applyTheme(Theme.Auto);

    expect(mockDocumentElement.setAttribute).toHaveBeenCalledWith("data-bs-theme", "light");
  });
});
