import { beforeEach, describe, expect, it, vi } from "vitest";
import * as notifications from "@/platform/notifications";
import browser from "../setupTests";

describe("showNotification", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("calls browser.notifications.create with correct options", async () => {
    await notifications.showNotification("Test message");
    expect(browser.notifications.create).toHaveBeenCalledWith(undefined, {
      type: "basic",
      title: "Aria2",
      iconUrl: "../icons/icon-browser-80.png",
      message: "Test message",
    });
  });
});
