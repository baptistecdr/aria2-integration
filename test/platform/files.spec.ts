import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import * as files from "@/platform/files";

describe("encodeFileToBase64", () => {
  const originalFileReader = global.FileReader;

  afterEach(() => {
    global.FileReader = originalFileReader;
  });

  it("resolves with base64 string for valid file", async () => {
    const file = new Blob(["test"], { type: "text/plain" });
    Object.defineProperty(file, "name", { value: "test.txt" });
    const result = await files.encodeFileToBase64(file);
    expect(typeof result).toBe("string");
    expect(result).toMatch(/^[A-Za-z0-9+/=]+$/);
  });

  it("rejects if FileReader fails", async () => {
    const file = new Blob(["test"]);
    global.FileReader = class {
      onerror: any;
      onloadend: any;
      abort() {}
      readAsDataURL() {
        this.onerror();
      }
    } as any;

    await expect(files.encodeFileToBase64(file)).rejects.toThrow();
  });

  it("rejects if result doesn't contain valid base64", async () => {
    const file = new Blob(["test"]);
    global.FileReader = class {
      onloadend: any;
      result = "invalid";
      abort() {}
      readAsDataURL() {
        setTimeout(() => this.onloadend(), 0);
      }
    } as any;

    await expect(files.encodeFileToBase64(file)).rejects.toThrow("Cannot get base64 encoded string");
  });

  it("rejects if result is empty", async () => {
    const file = new Blob(["test"]);
    global.FileReader = class {
      onloadend: any;
      result = null;
      abort() {}
      readAsDataURL() {
        setTimeout(() => this.onloadend(), 0);
      }
    } as any;

    await expect(files.encodeFileToBase64(file)).rejects.toThrow("Result is empty");
  });
});

describe("download", () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    global.fetch = vi.fn();
    vi.clearAllMocks();
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it("fetches and returns a blob", async () => {
    const blob = new Blob(["data"]);
    global.fetch = vi.fn().mockResolvedValue({ blob: () => blob });
    const result = await files.download("http://test");
    expect(global.fetch).toHaveBeenCalledWith("http://test");
    expect(result).toBe(blob);
  });

  it("throws error if fetch fails", async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error("Network error"));
    await expect(files.download("http://test")).rejects.toThrow("Network error");
  });
});
