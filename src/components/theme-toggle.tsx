"use client";

import { useSyncExternalStore } from "react";
import { Moon, Sun } from "lucide-react";
import { useLang } from "@/lib/i18n/context";

/**
 * Light/dark, by hand.
 *
 * The palette itself lives entirely in tokens (see globals.css), so this
 * writes one attribute on <html> and every surface, rule, badge, button and
 * hover follows. Absent a stored choice the CSS follows the OS; the moment
 * someone picks a side, `data-theme` overrides it — including when the OS
 * later flips, which is the whole point of a manual control.
 *
 * The matching no-flash script in layout.tsx applies the stored choice before
 * first paint, so nobody watches a white page resolve into a dark one.
 */

export const THEME_KEY = "nivaaran-theme";

type Theme = "light" | "dark";

/* The theme is browser state, not React state — it lives in localStorage and
   in a media query, both of which can change without us. Reading it through
   useSyncExternalStore keeps the icon honest without a mount effect that
   would render the wrong one and then swap it. */

const listeners = new Set<() => void>();

function subscribe(onChange: () => void) {
  const media = window.matchMedia("(prefers-color-scheme: dark)");
  media.addEventListener("change", onChange);
  // Another tab picking a theme should not leave this one lying.
  window.addEventListener("storage", onChange);
  listeners.add(onChange);
  return () => {
    media.removeEventListener("change", onChange);
    window.removeEventListener("storage", onChange);
    listeners.delete(onChange);
  };
}

function readStored(): Theme | null {
  try {
    const v = localStorage.getItem(THEME_KEY);
    return v === "dark" || v === "light" ? v : null;
  } catch {
    return null;
  }
}

function currentTheme(): Theme {
  return (
    readStored() ??
    (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light")
  );
}

/** The server cannot know which way the reader's OS leans, so it commits to
 *  neither and the button holds its space until hydration says. */
const noThemeOnServer = () => null;

export function ThemeToggle({ isDark = false }: { isDark?: boolean }) {
  const { lang } = useLang();
  const theme = useSyncExternalStore(subscribe, currentTheme, noThemeOnServer);

  function toggle() {
    const next: Theme = theme === "dark" ? "light" : "dark";
    document.documentElement.dataset.theme = next;
    try {
      localStorage.setItem(THEME_KEY, next);
    } catch {
      // Private mode, or storage denied. The choice still holds for this page.
    }
    for (const l of listeners) l();
  }

  const label =
    theme === "dark"
      ? lang === "hi"
        ? "उजला रूप"
        : "Light mode"
      : lang === "hi"
        ? "गहरा रूप"
        : "Dark mode";

  return (
    <button
      type="button"
      onClick={toggle}
      title={label}
      aria-label={label}
      className={`inline-flex size-11 shrink-0 items-center justify-center rounded-ctl border transition-colors ${
        isDark
          ? "border-white/20 bg-white/5 text-white hover:bg-white/10"
          : "border-line-strong bg-paper-raised text-ink hover:border-ink-mute hover:bg-paper-sunk"
      }`}
    >
      {theme === "dark" ? (
        <Sun aria-hidden className="size-4" strokeWidth={1.8} />
      ) : theme === "light" ? (
        <Moon aria-hidden className="size-4" strokeWidth={1.8} />
      ) : (
        // Pre-hydration: hold the space rather than commit to an icon.
        <span aria-hidden className="size-4" />
      )}
    </button>
  );
}
