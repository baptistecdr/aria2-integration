/**
 * Global test setup with matchMedia mock for jsdom compatibility
 * 
 * Theme model uses window.matchMedia('(prefers-color-scheme: dark)') which jsdom doesn't implement
 * This polyfill ensures consistent theme switching behavior across all test environments
 */

import "@testing-library/jest-dom/vitest";
import { vi } from "vitest";

// Create a full mock for the browser API
const browser = {
  runtime: {
    sendMessage: vi.fn(),
    onMessage: {
      addListener: vi.fn(),
      removeListener: vi.fn(),
      hasListener: vi.fn(),
    },
    onInstalled: {
      addListener: vi.fn(),
      removeListener: vi.fn(),
      hasListener: vi.fn(),
    },
    id: "test-extension-id",
    getURL: vi.fn((path) => `https://example.com/${path}`),
    getPlatformInfo: vi.fn().mockResolvedValue({ os: "linux" }),
  },
  storage: {
    local: {
      get: vi.fn(),
      set: vi.fn(),
      remove: vi.fn(),
    },
    sync: {
      get: vi.fn().mockResolvedValue({}),
      set: vi.fn().mockResolvedValue(undefined),
      remove: vi.fn().mockResolvedValue(undefined),
    },
    onChanged: {
      addListener: vi.fn(),
      removeListener: vi.fn(),
      hasListener: vi.fn(),
    },
  },
  downloads: {
    download: vi.fn(),
    onCreated: {
      addListener: vi.fn(),
      removeListener: vi.fn(),
      hasListener: vi.fn(),
    },
    onChanged: {
      addListener: vi.fn(),
      removeListener: vi.fn(),
      hasListener: vi.fn(),
    },
  },
  contextMenus: {
    onClicked: {
      addListener: vi.fn(),
      removeListener: vi.fn(),
      hasListener: vi.fn(),
    },
    removeAll: vi.fn(),
    create: vi.fn(),
  },
  commands: {
    onCommand: {
      addListener: vi.fn(),
      removeListener: vi.fn(),
      hasListener: vi.fn(),
    },
  },
  tabs: {
    query: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    remove: vi.fn(),
  },
  alarms: {
    onAlarm: {
      addListener: vi.fn(),
      removeListener: vi.fn(),
      hasListener: vi.fn(),
    },
    create: vi.fn(),
    get: vi.fn(),
    getAll: vi.fn(),
    clear: vi.fn(),
    clearAll: vi.fn(),
  },
  i18n: {
    getMessage: vi.fn((key) => `Translated: ${key}`),
    getUILanguage: vi.fn(() => "en"),
  },
  action: {
    setBadgeText: vi.fn(),
    setBadgeBackgroundColor: vi.fn(),
  },
  notifications: {
    create: vi.fn(),
    clear: vi.fn(),
    onClicked: {
      addListener: vi.fn(),
      removeListener: vi.fn(),
      hasListener: vi.fn(),
    },
  },
};

vi.stubGlobal("browser", browser);
vi.stubGlobal("chrome", browser);

/**
 * MatchMedia Mock Polyfill for JSDOM compatibility
 * Theme model uses window.matchMedia('(prefers-color-scheme: dark)') which jsdom doesn't implement
 */

// Inject mock matchMedia if undefined in test environment (jsdom needs polyfill)
if (typeof global.window === "undefined" || !global.window.matchMedia) {
  const createMock = function(query, matches) {
    return {
      query: query,
      matches: matches,
      addEventListener: function() {},
      removeEventListener: function() {},
      toString: function() { return this.query; }
    };
  };

  // Inject mock function that defaults to light mode unless overridden by test
  global.window.matchMedia = function(query) {
    var matches = false;
    
    // Check for test-specific theme mode flag set by setupMatchMediaMock()
    if (global.testThemeMode === 'dark') {
      matches = true;
    }

    return createMock(query, matches);
  };
}

/**
 * Export test utilities for per-test customization of theme mode
 */
export function setupMatchMediaMock(mode) {
  if (mode === "dark") {
    global.testThemeMode = "dark";
  } else {
    delete global.testThemeMode;
  }
}

/**
 * Mock matchMedia to handle both dark and light queries correctly
 */
const mockMatchMedia = function(query) {
  // Check for test-specific theme mode flag set by setupMatchMediaMock()
  var isDarkMode = false;
  if (typeof global.testThemeMode !== 'undefined' && global.testThemeMode === 'dark') {
    isDarkMode = true;
  }
  
  // DEBUG: Log the actual value being returned
  console.log('mockMatchMedia query:', query, 'isDarkMode:', isDarkMode);
  
  return {
    query: query,
    matches: isDarkMode,  // Dark mode when flag set, light mode (false) otherwise
    addEventListener: function() {},
    removeEventListener: function() {},
    toString: function() { return this.query; }
  };
};

// Inject mock matchMedia if undefined in test environment (jsdom needs polyfill)
if (typeof global.window === "undefined" || !global.window.matchMedia) {
  // Use the mockMatchMedia function defined above, not a different one
  global.window.matchMedia = mockMatchMedia;
}

export default browser;