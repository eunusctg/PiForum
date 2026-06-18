"use client";

import { useEffect } from "react";
import { useTheme } from "next-themes";
import { useAppStore, type ThemeMode } from "@/lib/store";

/**
 * ThemeManager
 * ------------
 * Coordinates the three selectable themes (Day / Night / Golden).
 *
 * - `light` and `dark` are delegated to next-themes (which toggles the
 *   `.dark` class on <html>).
 * - `gold` is a custom theme: we force next-themes into "light" (so no
 *   `.dark` class is present) and add a `.gold` class to <html>. The
 *   `.gold` CSS block overrides the `:root` variables.
 *
 * The chosen mode is persisted in localStorage ("piforum_theme") and
 * restored on mount so the preference survives reloads.
 */
export default function ThemeManager() {
  const themeMode = useAppStore((s) => s.themeMode);
  const setThemeMode = useAppStore((s) => s.setThemeMode);
  const { setTheme, theme: nextTheme } = useTheme();

  // Restore persisted theme on first mount (client-only)
  useEffect(() => {
    const saved = localStorage.getItem("piforum_theme") as ThemeMode | null;
    if (saved && saved !== themeMode) {
      setThemeMode(saved);
    }
  }, []);

  // Apply theme whenever themeMode changes
  useEffect(() => {
    const root = document.documentElement;

    if (themeMode === "gold") {
      // Golden mode: remove dark, add gold. next-themes kept in light
      // so its internal state stays consistent.
      root.classList.remove("dark");
      root.classList.add("gold");
      if (nextTheme !== "light") {
        setTheme("light");
      }
    } else {
      // Day or Night: remove gold, let next-themes manage light/dark
      root.classList.remove("gold");
      if (themeMode === "dark") {
        if (nextTheme !== "dark") setTheme("dark");
      } else {
        if (nextTheme !== "light") setTheme("light");
      }
    }
  }, [themeMode, setTheme, nextTheme]);

  return null;
}
