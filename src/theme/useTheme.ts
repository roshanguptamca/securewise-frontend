import { useEffect, useState } from "react";

export type Theme = "light" | "dark";

const STORAGE_KEY = "guidewisey-securewise-theme";

export function getInitialTheme(
  storage: Pick<Storage, "getItem"> = window.localStorage,
  prefersDark = window.matchMedia?.("(prefers-color-scheme: dark)").matches ??
    true,
): Theme {
  const saved = storage.getItem(STORAGE_KEY);
  if (saved === "light" || saved === "dark") return saved;
  return prefersDark ? "dark" : "light";
}

export function useTheme() {
  const [theme, setTheme] = useState<Theme>(() => getInitialTheme());

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    document.documentElement.style.colorScheme = theme;
    document
      .querySelector('meta[name="theme-color"]')
      ?.setAttribute("content", theme === "dark" ? "#05070f" : "#f6f7fb");
    window.localStorage.setItem(STORAGE_KEY, theme);
  }, [theme]);

  const toggleTheme = () =>
    setTheme((current) => (current === "dark" ? "light" : "dark"));

  return { theme, toggleTheme };
}
