"use client";
import Link from "next/link";
import { useState } from "react";
import { prettyDate } from "@/lib/recurrence";
import QuickLogSheet, { type LogTarget } from "@/components/QuickLogSheet";

/** Dashboard strip of recurring upkeep, each with a one-tap "✓ Done" that opens the quick log. */
export default function RecurringStrip({ items }: { items: { id: string; title: string; months: number | null; due: string | null }[] }) {
  const [logging, setLogging] = useState<LogTarget | null>(null);
  const today = new Date().toISOString().slice(0, 10);
  return (
    <section className="mt-4" aria-label="Recurring upkeep">
      <div className="mb-2 flex items-baseline justify-between">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">🔁 Recurring upkeep</h2>
        <Link href="/upkeep" className="text-xs text-moss underline">See all</Link>
      </div>
      <div className="-mx-4 flex gap-3 overflow-x-auto px-4 pb-1 md:mx-0 md:px-0">
        {items.map((t) => {
          const overdue = !!t.due && t.due < today;
          return (
            <div key={t.id} className="card flex min-w-[15rem] shrink-0 items-center gap-3 px-4 py-3">
              <Link href={`/projects/${t.id}`} className="min-w-0 flex-1">
                <div className="truncate font-semibold">{t.title}</div>
                <div className={`truncate text-xs ${overdue ? "font-semibold text-berry" : "text-muted"}`}>
                  {t.due ? (overdue ? `⏰ Overdue since ${prettyDate(t.due)}` : `Next due ${prettyDate(t.due)}`) : "Not logged yet"}
                </div>
              </Link>
              <button type="button" onClick={() => setLogging({ id: t.id, title: t.title, months: t.months })}
                className="shrink-0 rounded-full border-2 border-moss px-3 py-1.5 text-sm font-semibold text-moss active:scale-95">✓ Done</button>
            </div>
          );
        })}
      </div>
      <QuickLogSheet task={logging} onClose={() => setLogging(null)} />
    </section>
  );
}
