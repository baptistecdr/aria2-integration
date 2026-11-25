import i18n, { getUILanguage } from "@/platform/i18n";

// Declares the language the page is shown in and its title, so that screen readers pronounce the page and announce it
// correctly: the HTML files are written in English, whatever the browser's language.
export function describePage(title: string) {
  document.documentElement.lang = getUILanguage();
  document.title = title;
}

export function extensionName() {
  return i18n("extName");
}
