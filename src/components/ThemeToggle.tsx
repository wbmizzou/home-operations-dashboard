"use client";
import { Monitor, Moon, Sun } from "lucide-react";
import { useLocalStorage } from "@/lib/useBrowserValue";

type Theme = "system" | "light" | "dark";
const KEY = "hh-theme";
const NEXT: Record<Theme, Theme> = { system: "light", light: "dark", dark: "system" };
const LABEL: Record<Theme, string> = { system: "Auto", light: "Light", dark: "Dark" };
const ICON = { system: Monitor, light: Sun, dark: Moon };

/** Cycles Auto (follow the device) → Light → Dark. Remembered on this device. */
export default function ThemeToggle({ className = "" }: { className?: string }) {
  const [stored, store] = useLocalStorage(KEY);
  const theme: Theme = stored === "light" || stored === "dark" ? stored : "system";

  function apply(next: Theme) {
    store(next === "system" ? null : next);
    const root = document.documentElement;
    if (next === "system") delete root.dataset.theme; else root.dataset.theme = next;
    // Keep the phone's status bar in step with the page background.
    const bg = getComputedStyle(root).getPropertyValue("--bg").trim();
    document.querySelectorAll('meta[name="theme-color"]').forEach((m) => m.setAttribute("content", bg));
  }

  const Icon = ICON[theme];
  return (
    <button type="button" onClick={() => apply(NEXT[theme])} aria-label={`Theme: ${LABEL[theme]}. Tap to change.`}
      className={`inline-flex h-8 items-center gap-1.5 whitespace-nowrap rounded-lg border border-line bg-surface px-2.5 text-xs font-medium text-muted transition-colors duration-150 hover:text-ink ${className}`}>
      <Icon size={14} strokeWidth={1.5} aria-hidden />
      {LABEL[theme]}
    </button>
  );
}
