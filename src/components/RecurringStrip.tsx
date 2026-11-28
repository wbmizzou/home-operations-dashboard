"use client";
import Link from "next/link";
import { useState } from "react";
import { Check } from "lucide-react";
import { prettyDate } from "@/lib/recurrence";
import QuickLogSheet, { type LogTarget } from "@/components/QuickLogSheet";
import type { Recurrence } from "@/lib/rrule";

/** Dashboard strip of recurring upkeep, each with a one-tap "Done" that opens the quick log. */
export default function RecurringStrip({ items, soon }: { items: { id: string; title: string; months: number | null; rule: Recurrence | null; due: string | null; logged: boolean }[]; soon: boolean }) {
  const [logging, setLogging] = useState<LogTarget | null>(null);
  const today = new Date().toISOString().slice(0, 10);
  return (
    <section className="mt-6" aria-label="Recurring upkeep">
      <div className="mb-3 flex items-baseline justify-between">
        <h2 className="text-base">{soon ? <>Upkeep due soon <span className="ml-1 text-sm font-normal tabular-nums text-muted">{items.length}</span></> : "Next upkeep"}</h2>
        <Link href="/upkeep" className="text-sm text-moss underline-offset-4 hover:underline">See all</Link>
      </div>
      <div className="-mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto scroll-px-4 px-4 pb-1 md:mx-0 md:scroll-px-0 md:px-0">
        {items.map((t) => {
          const overdue = !!t.due && t.due < today;
          return (
            <div key={t.id} className={`card flex shrink-0 snap-start items-center gap-3 px-4 py-3 ${items.length > 1 ? "w-[80%] sm:w-[19rem]" : "w-full sm:w-[24rem]"}`}>
              <Link href={`/projects/${t.id}`} className="min-w-0 flex-1">
                <div className="truncate font-medium">{t.title}</div>
                <div className={`mt-0.5 truncate text-xs tabular-nums ${overdue ? "font-medium text-berry" : "text-muted"}`}>
                  {!t.due ? "No schedule set" : overdue && !t.logged ? "Due now · never logged" : overdue ? `Overdue since ${prettyDate(t.due)}` : t.due === today ? "Due today" : `Due ${prettyDate(t.due)}`}
                </div>
              </Link>
              <button type="button" onClick={() => setLogging({ id: t.id, title: t.title, months: t.months, rule: t.rule })}
                className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-lg border border-line bg-surface px-3 text-sm font-medium text-ink transition-[background-color,transform] duration-150 hover:bg-raised active:scale-[.97]">
                <Check size={16} strokeWidth={1.75} className="text-moss" aria-hidden />Done
              </button>
            </div>
          );
        })}
      </div>
      <QuickLogSheet task={logging} onClose={() => setLogging(null)} />
    </section>
  );
}
