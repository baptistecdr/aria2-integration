import { describe, it, expect, vi } from "vitest";
import Theme, { applyTheme } from "../../src/models/theme";
import { setupMatchMediaMock } from "../setupTests";

// Mock window.matchMedia for JSDOM - handle both dark and light queries
const mockMatchMedia = (query: string) => {
  // Handle dark preference query — use setupMatchMediaMock global flag
  const isDarkQuery = query.includes("(prefers-color-scheme: dark)");
  
  // Return false (light mode) by default unless in dark mode test setup
  return {
    matches: !isDarkQuery || ((global as any).testThemeMode === 'dark'),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    media: query,
  } as unknown as MediaQueryList;
};

Object.defineProperty(window, "matchMedia", {
  value: vi.fn().mockImplementation(mockMatchMedia),
  writable: true,
});

// Dark mode test setup function
export function setDarkMode() {
  setupMatchMediaMock("dark");
}

// Light mode (default) — no setup needed

describe("applyTheme", () => {
  beforeEach(() => {
    // Reset the theme on every test
    document.documentElement.setAttribute("data-bs-theme", "light");
    vi.clearAllMocks();
    // Clean up dark mode flag from previous tests
    delete (global as any).testThemeMode;
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
    setDarkMode();  // Setup dark mode preference
    applyTheme(Theme.Auto);
    expect(document.documentElement.getAttribute("data-bs-theme")).toBe("dark");
  });

  it("applies light theme when Theme.Auto is passed and system prefers light", () => {
    // Light mode is default (no setup needed) - beforeEach cleans up dark mode flag
    applyTheme(Theme.Auto);
    expect(document.documentElement.getAttribute("data-bs-theme")).toBe("light");
  });
});
