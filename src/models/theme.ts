enum Theme {
  Light = "light",
  Dark = "dark",
  Auto = "auto",
}

export function applyTheme(theme: Theme) {
  const updateTheme = () => {
    const isDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    
    if (theme === Theme.Auto) {
      document.documentElement.setAttribute("data-bs-theme", isDark ? Theme.Dark : Theme.Light);
    } else {
      document.documentElement.setAttribute("data-bs-theme", theme);
    }
  };

  updateTheme();
}

export default Theme;
