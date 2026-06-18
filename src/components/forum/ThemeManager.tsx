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
 *
 * Browser chrome color: the `<meta name="theme-color">` tag is synced
 * live with the active theme so mobile browser headers, PWA toolbars,
 * and the iOS status bar match the page (Day=#e6e6e8, Night=#2A1F0A,
 * Golden=#D4AF37). Both the static tag (in <head>) and any dynamically
 * injected tags are kept in sync.
 */

/* The exact background colors used by each theme's `--background` token.
   Kept in sync with src/app/globals.css. */
const THEME_COLORS: Record<ThemeMode, string> = {
  light: "#e6e6e8",
  dark: "#2A1F0A",
  gold: "#D4AF37",
};

/* Update every <meta name="theme-color"> tag in the document head so the
   browser chrome (mobile address bar, PWA toolbar, iOS status bar) matches
   the active theme. */
function syncThemeColorMeta(mode: ThemeMode) {
  const color = THEME_COLORS[mode];
  if (typeof document === "undefined") return;
  const metas = document.querySelectorAll<HTMLMetaElement>(
    'meta[name="theme-color"]'
  );
  metas.forEach((m) => {
    m.setAttribute("content", color);
  });
  // Also keep the iOS-specific apple-mobile-web-app-status-bar-style in sync
  const apple = document.querySelector<HTMLMetaElement>(
    'meta[name="apple-mobile-web-app-status-bar-style"]'
  );
  if (apple) {
    // "default" lets the bar adapt to the page; black-translucent for dark/gold
    apple.setAttribute(
      "content",
      mode === "light" ? "default" : "black-translucent"
    );
  }
}

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

    // Sync browser chrome color with the active theme
    syncThemeColorMeta(themeMode);
  }, [themeMode, setTheme, nextTheme]);

  return null;
}
