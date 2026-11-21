import { filesize } from "filesize";
import { ExtensionOptions } from "@/domain/extension-options";
import type Theme from "@/domain/theme";

const FILESIZE_BASE = { base: 2, output: "object" } as const;

// The extension options as edited in the options page: lists are typed as comma separated text and the minimum file
// size is a number with a unit (0: B, 1: KiB, 2: MiB, 3: GiB).
export interface ExtensionOptionsFormValues {
  captureDownloads: boolean;
  captureServer: string;
  minFileSize: number;
  minFileSizeExponent: number;
  excludedProtocols: string;
  excludedSites: string;
  excludedFileTypes: string;
  useCompleteFilePath: boolean;
  notifyUrlIsAdded: boolean;
  notifyFileIsAdded: boolean;
  notifyErrorOccurs: boolean;
  theme: Theme;
}

export function parseList(text: string): string[] {
  return text
    .trim()
    .split(/\s*,+\s*/)
    .filter((s) => s !== "");
}

export function formatList(list: string[]): string {
  return list.join(", ");
}

export function toExtensionOptionsFormValues(options: ExtensionOptions): ExtensionOptionsFormValues {
  const { value, exponent } = filesize(options.minFileSizeInBytes, FILESIZE_BASE);
  return {
    captureDownloads: options.captureDownloads,
    captureServer: options.captureServer,
    minFileSize: value as number,
    minFileSizeExponent: exponent as number,
    excludedProtocols: formatList(options.excludedProtocols),
    excludedSites: formatList(options.excludedSites),
    excludedFileTypes: formatList(options.excludedFileTypes),
    useCompleteFilePath: options.useCompleteFilePath,
    notifyUrlIsAdded: options.notifyUrlIsAdded,
    notifyFileIsAdded: options.notifyFileIsAdded,
    notifyErrorOccurs: options.notifyErrorOccurs,
    theme: options.theme,
  };
}

// Applies the form to the options. The servers are edited in their own tabs, so they are kept as they are.
export function applyExtensionOptionsFormValues(options: ExtensionOptions, values: ExtensionOptionsFormValues): ExtensionOptions {
  return ExtensionOptions.create({
    servers: options.servers,
    captureServer: values.captureServer,
    captureDownloads: values.captureDownloads,
    minFileSizeInBytes: values.minFileSize * 1024 ** values.minFileSizeExponent,
    excludedProtocols: parseList(values.excludedProtocols),
    excludedSites: parseList(values.excludedSites),
    excludedFileTypes: parseList(values.excludedFileTypes),
    useCompleteFilePath: values.useCompleteFilePath,
    notifyUrlIsAdded: values.notifyUrlIsAdded,
    notifyFileIsAdded: values.notifyFileIsAdded,
    notifyErrorOccurs: values.notifyErrorOccurs,
    theme: values.theme,
  });
}
