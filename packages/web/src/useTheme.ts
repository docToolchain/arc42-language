import { useState, useEffect, useCallback } from "react";

type Theme = "dark" | "light";

function getSystemTheme(): Theme {
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function getStoredTheme(): Theme | null {
  const stored = localStorage.getItem("theme");
  if (stored === "dark" || stored === "light") return stored;
  return null;
}

function applyTheme(theme: Theme | null) {
  if (theme) {
    document.documentElement.setAttribute("data-theme", theme);
  } else {
    document.documentElement.removeAttribute("data-theme");
  }
}

export function useTheme() {
  const [theme, setThemeState] = useState<Theme>(() => {
    return getStoredTheme() ?? getSystemTheme();
  });

  useEffect(() => {
    // Apply the initial theme to the DOM on mount
    applyTheme(getStoredTheme());

    // Listen for system preference changes when no override is set
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = () => {
      if (!getStoredTheme()) {
        setThemeState(getSystemTheme());
      }
    };
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  const toggle = useCallback(() => {
    const current = getStoredTheme() ?? getSystemTheme();
    const next: Theme = current === "dark" ? "light" : "dark";
    const systemTheme = getSystemTheme();

    if (next === systemTheme) {
      // Result matches system — clear the override
      localStorage.removeItem("theme");
      applyTheme(null);
    } else {
      localStorage.setItem("theme", next);
      applyTheme(next);
    }
    setThemeState(next);
  }, []);

  return { theme, toggle };
}
