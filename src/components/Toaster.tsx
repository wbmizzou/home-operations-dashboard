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
        className="pointer-events-auto flex max-w-md items-center gap-3 rounded-full px-5 py-3 text-sm font-semibold shadow-lg"
        style={{ background: "var(--ink)", color: "var(--bg)" }}>
        <span>{t.message}</span>
        {t.action && (
          <button type="button" className="rounded-full px-3 py-1 font-bold underline-offset-2 hover:underline" style={{ color: "var(--gold)" }}
            onClick={async () => { const a = t.action!; setT(null); await a.run(); }}>
            {t.action.label}
          </button>
        )}
      </div>
    </div>
  );
}
