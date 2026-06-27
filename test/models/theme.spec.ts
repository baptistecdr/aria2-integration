import { describe, it, expect, vi } from "vitest";
import Theme, { applyTheme } from "../src/models/theme";

// Mock window.matchMedia for JSDOM
const mockMatchMedia = (query: string) => {
  return {
    matches: query === "(prefers-color-scheme: dark)",
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    media: query,
  } as MediaQueryList;
};

Object.defineProperty(window, "matchMedia", {
  value: vi.fn().mockImplementation(mockMatchMedia),
  writable: true,
});

describe("applyTheme", () => {
  beforeEach(() => {
    // Reset the theme on every test
    document.documentElement.setAttribute("data-bs-theme", "light");
    vi.clearAllMocks();
  });

  it("applies light theme when Theme.Light is passed", () => {
    applyTheme(Theme.Light);
    expect(document.documentElement.getAttribute("data-bs-theme")).toBe("light");
  });

  it("applies dark theme when Theme.Dark is passed", () => {
    applyTheme(Theme.Dark);
    expect(document.documentElement.getAttribute("data-bs-theme")).toBe("dark");
  });

  it("applies dark theme when Theme.Auto is passed and system prefers dark", () => {
    applyTheme(Theme.Auto);
    expect(document.documentElement.getAttribute("data-bs-theme")).toBe("dark");
  });

  it("applies light theme when Theme.Auto is passed and system prefers light", () => {
    applyTheme(Theme.Auto);
    expect(document.documentElement.getAttribute("data-bs-theme")).toBe("light");
  });
});
