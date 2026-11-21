import { beforeEach, describe, expect, it, vi } from "vitest";
import browser from "webextension-polyfill";
import { ALARM_NAME, createBadgeUpdater, scheduleBadgeUpdates } from "@/background/badge";
import type { Connections } from "@/background/connections";
import { Server } from "@/domain/server";
import { ServerIncognitoModeOptions } from "@/domain/server-incognito-mode-options";
import { findCurrentTab } from "@/platform/tabs";
import { type Aria2Client, createAria2Client } from "@/services/aria2-client";
import { fakeOptionsStore } from "../helpers/fake-options-store";

vi.mock("@/platform/tabs", () => ({
  findCurrentTab: vi.fn(),
}));

function globalStat(numActive: number, numStopped = 0) {
  return { downloadSpeed: "0", uploadSpeed: "0", numActive: `${numActive}`, numWaiting: "0", numStopped: `${numStopped}`, numStoppedTotal: "0" };
}

// A real client whose RPC calls are answered by `call`.
function fakeAria2(call: (method: string) => Promise<unknown>) {
  const rpc = { call: vi.fn(call), multicall: vi.fn() };
  return Object.assign(createAria2Client({}, rpc), { rpc });
}

function connectionsOf(...entries: [Server, Aria2Client][]): Connections {
  return { get: vi.fn(), all: () => entries };
}

describe("Badge", () => {
  const alarm = { name: ALARM_NAME } as browser.Alarms.Alarm;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(findCurrentTab).mockResolvedValue(undefined);
  });

  it("schedules the badge updates", () => {
    scheduleBadgeUpdates();

    expect(browser.alarms.create).toHaveBeenCalledWith(ALARM_NAME, { periodInMinutes: 5 / 60 });
  });

  it("sets empty badge text if no active downloads", async () => {
    await createBadgeUpdater({ store: fakeOptionsStore(), connections: connectionsOf() })(alarm);

    expect(browser.action.setBadgeText).toHaveBeenCalledWith({ text: "" });
    expect(browser.action.setBadgeBackgroundColor).toHaveBeenCalledWith({ color: "#666666" });
  });

  it("does nothing if alarm name does not match", async () => {
    await createBadgeUpdater({ store: fakeOptionsStore(), connections: connectionsOf() })({ name: "other-alarm" } as browser.Alarms.Alarm);

    expect(browser.action.setBadgeText).not.toHaveBeenCalled();
    expect(browser.action.setBadgeBackgroundColor).not.toHaveBeenCalled();
  });

  it("shows the number of active downloads of every server", async () => {
    const connections = connectionsOf([Server.create(), fakeAria2(async () => globalStat(2))], [Server.create(), fakeAria2(async () => globalStat(3))]);

    await createBadgeUpdater({ store: fakeOptionsStore(), connections })(alarm);

    expect(browser.action.setBadgeText).toHaveBeenCalledWith({ text: "5" });
  });

  it("still counts the other servers when one is unreachable", async () => {
    const connections = connectionsOf(
      [Server.create(), fakeAria2(async () => Promise.reject(new Error("unreachable")))],
      [Server.create(), fakeAria2(async () => globalStat(1))],
    );

    await createBadgeUpdater({ store: fakeOptionsStore(), connections })(alarm);

    expect(browser.action.setBadgeText).toHaveBeenCalledWith({ text: "1" });
  });

  it.each([
    { description: "purges finished downloads in incognito mode when the server asks for it", incognito: true, purge: true, expected: true },
    { description: "does not purge finished downloads outside incognito mode", incognito: false, purge: true, expected: false },
    { description: "does not purge finished downloads when the server does not ask for it", incognito: true, purge: false, expected: false },
  ])("$description", async ({ incognito, purge, expected }) => {
    vi.mocked(findCurrentTab).mockResolvedValue({ incognito } as browser.Tabs.Tab);
    const server = Server.create({ incognitoModeOptions: ServerIncognitoModeOptions.create({ automaticallyPurgeDownloads: purge }) });
    const aria2 = fakeAria2(async (method: string) => (method === "getGlobalStat" ? globalStat(0, 1) : "OK"));

    await createBadgeUpdater({ store: fakeOptionsStore(), connections: connectionsOf([server, aria2]) })(alarm);

    if (expected) {
      expect(aria2.rpc.call).toHaveBeenCalledWith("aria2.purgeDownloadResult");
    } else {
      expect(aria2.rpc.call).not.toHaveBeenCalledWith("aria2.purgeDownloadResult");
    }
  });
});
