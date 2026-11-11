"use client";
import { useEffect, useState } from "react";

type Theme = "system" | "light" | "dark";
const KEY = "hh-theme";
const NEXT: Record<Theme, Theme> = { system: "light", light: "dark", dark: "system" };
const LABEL: Record<Theme, string> = { system: "🖥️ Auto", light: "☀️ Light", dark: "🌙 Dark" };

/** Cycles Auto (follow the device) → Light → Dark. Remembered on this device. */
export default function ThemeToggle({ className = "" }: { className?: string }) {
  const [theme, setTheme] = useState<Theme>("system");
  useEffect(() => {
    try { setTheme((localStorage.getItem(KEY) as Theme) || "system"); } catch {}
  }, []);

  function apply(next: Theme) {
    setTheme(next);
    try { if (next === "system") localStorage.removeItem(KEY); else localStorage.setItem(KEY, next); } catch {}
    const root = document.documentElement;
    if (next === "system") delete root.dataset.theme; else root.dataset.theme = next;
    // Keep the phone's status bar in step with the page background.
    const bg = getComputedStyle(root).getPropertyValue("--bg").trim();
    document.querySelectorAll('meta[name="theme-color"]').forEach((m) => m.setAttribute("content", bg));
  }

  return (
    <button type="button" onClick={() => apply(NEXT[theme])} aria-label={`Theme: ${LABEL[theme]}. Tap to change.`}
      className={`whitespace-nowrap rounded-full border border-line px-3 py-1.5 text-xs font-semibold text-muted hover:text-ink ${className}`}
      style={{ background: "color-mix(in srgb, var(--surface) 85%, transparent)" }}>
      {LABEL[theme]}
    </button>
  );
}
