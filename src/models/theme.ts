enum Theme {
  Light = "light",
  Dark = "dark",
  Auto = "auto",
}

export function applyTheme(theme: Theme) {
  if (theme === Theme.Auto && window.matchMedia("(prefers-color-scheme: dark)").matches) {
    document.documentElement.setAttribute("data-bs-theme", Theme.Dark);
  } else if (theme === Theme.Auto && window.matchMedia("(prefers-color-scheme: light)").matches) {
    document.documentElement.setAttribute("data-bs-theme", Theme.Light);
  } else {
    document.documentElement.setAttribute("data-bs-theme", theme);
  }
}

export default Theme;
