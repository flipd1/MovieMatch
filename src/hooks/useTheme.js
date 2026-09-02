import { useCallback, useEffect, useState } from "react";

const STORAGE_KEY = "moviematch.theme";

function getInitialTheme() {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved === "light" || saved === "dark") return saved;
  // No saved preference yet: respect system preference, but default to
  // dark (matching the app's original design) unless the system explicitly
  // prefers light.
  const prefersLight = window.matchMedia?.(
    "(prefers-color-scheme: light)"
  ).matches;
  return prefersLight ? "light" : "dark";
}

export function useTheme() {
  const [theme, setThemeState] = useState(getInitialTheme);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
  }, [theme]);

  const setTheme = useCallback((next) => {
    setThemeState(next);
    localStorage.setItem(STORAGE_KEY, next);
  }, []);

  const toggleTheme = useCallback(() => {
    setTheme(theme === "dark" ? "light" : "dark");
  }, [theme, setTheme]);

  return { theme, toggleTheme };
}
