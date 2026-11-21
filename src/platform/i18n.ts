import browser from "webextension-polyfill";

// The names of the messages in public/_locales/*/messages.json: a typo in a message name fails the type check.
export type MessageKey = keyof typeof import("../../public/_locales/en/messages.json");

// The message in the browser's language, with its $1, $2... placeholders replaced by the substitutions.
export default function i18n(key: MessageKey, substitutions?: string | string[]): string {
  return browser.i18n.getMessage(key, substitutions);
}

export function getUILanguage(): string {
  return browser.i18n.getUILanguage();
}
