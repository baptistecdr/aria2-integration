import ExtensionOptions from "@/models/extension-options";

enum Theme {
  Light = "light",
  Dark = "dark",
  Auto = "auto",
}

export function applyTheme(extensionOptions: ExtensionOptions) {
  if (extensionOptions.theme === Theme.Auto && window.matchMedia("(prefers-color-scheme: dark)").matches) {
    document.documentElement.setAttribute("data-bs-theme", Theme.Dark);
  } else if (extensionOptions.theme === Theme.Auto && window.matchMedia("(prefers-color-scheme: light)").matches) {
    document.documentElement.setAttribute("data-bs-theme", Theme.Light);
  } else {
    document.documentElement.setAttribute("data-bs-theme", extensionOptions.theme);
  }
}

export default Theme;
