"use client";
import { useEffect, useRef, useState } from "react";
import type { ToastDetail } from "@/lib/toast";

export default function Toaster() {
  const [t, setT] = useState<(ToastDetail & { key: number }) | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => {
    const on = (e: Event) => {
      const d = (e as CustomEvent<ToastDetail>).detail;
      clearTimeout(timer.current);
      setT({ ...d, key: Date.now() });
      timer.current = setTimeout(() => setT(null), d.ms ?? 3000);
    };
    window.addEventListener("hh-toast", on);
    return () => window.removeEventListener("hh-toast", on);
  }, []);

  if (!t) return null;
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-[calc(5.5rem+env(safe-area-inset-bottom))] z-[60] flex justify-center px-4 md:bottom-6 md:pl-60">
      <div key={t.key} role="status" aria-live="polite"
        className="pointer-events-auto flex max-w-md items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium shadow-[0_8px_24px_rgba(31,27,22,0.16)]"
        style={{ background: "var(--ink)", color: "var(--bg)" }}>
        <span>{t.message}</span>
        {t.action && (
          <button type="button" className="rounded-md px-2 py-1 font-medium underline underline-offset-4 opacity-90 hover:opacity-100"
            onClick={async () => { const a = t.action!; setT(null); await a.run(); }}>
            {t.action.label}
          </button>
        )}
      </div>
    </div>
  );
}
