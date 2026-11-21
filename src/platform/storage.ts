import browser, { type Storage } from "webextension-polyfill";

export type StorageChanges = Record<string, Storage.StorageChange>;

export async function readSyncStorage(): Promise<Record<string, unknown>> {
  return browser.storage.sync.get(null);
}

export async function writeSyncStorage(items: Record<string, unknown>): Promise<void> {
  await browser.storage.sync.set(items);
}

// Returns undefined when no policy is configured or when the browser does not support managed storage.
export async function readManagedStorage(): Promise<Record<string, unknown> | undefined> {
  try {
    return await browser.storage.managed?.get(null);
  } catch {
    // Firefox rejects when no policy is configured: nothing to override.
    return undefined;
  }
}

export function onStorageChanged(listener: (changes: StorageChanges, areaName: string) => void): () => void {
  browser.storage.onChanged.addListener(listener);
  return () => browser.storage.onChanged.removeListener(listener);
}
