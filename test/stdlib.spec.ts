import { expect } from "vitest";
import { isWindowsPath } from "@/stdlib";

describe("Windows Path", () => {
  it("should detect as Windows path", () => {
    ["C:\\Users\\User\\Documents\\report.pdf", "\\\\server\\share\\folder\\file.txt", "..\\Projects\\2025\\notes.md", ".\\Projects\\2025\\notes.md"].forEach(
      (filepath) => {
        expect(isWindowsPath(filepath)).toBeTruthy();
      },
    );
  });

  it("should not detect as Windows path", () => {
    ["/home/user/documents/report.pdf", "../projects/2025/config.yaml", "./projects/2025/config.yaml"].forEach((filepath) => {
      expect(isWindowsPath(filepath)).toBeFalsy();
    });
  });
});
