"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { money } from "@/lib/constants";
import { prettyDate, type DueState } from "@/lib/recurrence";
import { toast } from "@/lib/toast";
import QuickLogSheet, { type LogTarget } from "@/components/QuickLogSheet";
import RecurrenceEditor, { defaultRule } from "@/components/RecurrenceEditor";
import { approxMonths, ruleFromMonths, type Recurrence } from "@/lib/rrule";

export type UpkeepTask = { id: string; title: string; months: number | null; rule: Recurrence | null; schedule: string; category: string | null; last: string | null; due: string | null; state: DueState };
export type HistoryEntry = { id: string; projectId: string; title: string; date: string; cost: number | null; notes: string | null };

const every = (m: number | null) => (!m ? "No schedule set" : m === 12 ? "Every year" : m === 24 ? "Every 2 years" : m === 1 ? "Every month" : `Every ${m} months`);

// Common home upkeep. `match` hides a suggestion when a recurring task with that word already exists.
const STARTER = [
  { title: "Replace HVAC filter", months: 3, match: "filter" },
  { title: "HVAC tune-up", months: 12, match: "hvac" },
  { title: "Clean gutters", months: 6, match: "gutter" },
  { title: "Test smoke & CO detectors", months: 6, match: "detector" },
  { title: "Flush water heater", months: 12, match: "water heater" },
  { title: "Clean dryer vent", months: 12, match: "dryer" },
  { title: "Termite inspection", months: 12, match: "termite" },
  { title: "Clean refrigerator coils", months: 12, match: "coil" },
  { title: "Service garage door", months: 12, match: "garage door" },
];

const STATE_STYLE: Record<DueState, { label: (t: UpkeepTask) => string; style: React.CSSProperties }> = {
  overdue: { label: (t) => (t.last ? `⏰ Overdue since ${prettyDate(t.due!)}` : "Due now"), style: { background: "color-mix(in srgb, var(--berry) 18%, transparent)", color: "var(--berry)" } },
  soon: { label: (t) => (t.due === new Date().toISOString().slice(0, 10) ? "Due today" : `Due ${prettyDate(t.due!)}`), style: { background: "color-mix(in srgb, var(--gold) 22%, transparent)", color: "var(--bark)" } },
  never: { label: () => "Not logged yet", style: { background: "var(--line)", color: "var(--muted)" } },
  later: { label: (t) => `Next ${prettyDate(t.due!)}`, style: { background: "color-mix(in srgb, var(--moss) 14%, transparent)", color: "var(--moss)" } },
};

export default function UpkeepBoard({ tasks, history, categories, existingTitles, defaultOwner }: {
  tasks: UpkeepTask[]; history: HistoryEntry[]; categories: { id: string; name: string }[]; existingTitles: string[]; defaultOwner: string | null;
}) {
  const router = useRouter();
  const [logging, setLogging] = useState<LogTarget | null>(null);
  const [adding, setAdding] = useState(false);
  const [starterOpen, setStarterOpen] = useState(tasks.length < 3);
  const lower = existingTitles.map((t) => t.toLowerCase());
  const suggestions = STARTER.filter((s) => !lower.some((t) => t.includes(s.match)));
  const [picked, setPicked] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);

  async function addStarter() {
    setBusy(true);
    const today = new Date().toISOString().slice(0, 10);
    const rows = STARTER.filter((s) => picked.includes(s.title)).map((s) => ({
      title: s.title, status: "Recurring", recurrence: ruleFromMonths(s.months, today), recurrence_months: s.months, priority: 2, owner: defaultOwner, seasons: [] as string[],
    }));
    const { error } = await createClient().from("projects").insert(rows);
    setBusy(false);
    if (error) return toast(`Couldn't add: ${error.message}`);
    toast(`Added ${rows.length} upkeep task${rows.length === 1 ? "" : "s"} ✓ — log when each was last done`);
    setPicked([]); router.refresh();
  }

  const years = [...new Set(history.map((h) => h.date.slice(0, 4)))];

  return (
    <>
      <header className="flex items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl text-moss">🔁 Upkeep</h1>
          <p className="text-sm text-muted">
            {tasks.length} recurring task{tasks.length === 1 ? "" : "s"}
            {tasks.filter((t) => t.state === "overdue").length > 0 && <> · <b className="text-berry">{tasks.filter((t) => t.state === "overdue").length} overdue</b></>}
          </p>
        </div>
        <button type="button" onClick={() => setAdding(true)} className="btn inline-flex shrink-0">＋ New task</button>
      </header>

      {/* Task cards */}
      <ul className="mt-5 grid gap-3 md:grid-cols-2">
        {tasks.map((t) => (
          <li key={t.id} className="card flex items-center gap-3 p-4">
            <Link href={`/projects/${t.id}`} className="min-w-0 flex-1">
              <div className="truncate font-semibold">{t.title}</div>
              <div className="truncate text-xs text-muted">{t.schedule} · {t.last ? `last ${prettyDate(t.last)}` : "not logged yet"}</div>
              <span className="mt-1.5 inline-block rounded-full px-2 py-0.5 text-[11px] font-semibold" style={STATE_STYLE[t.state].style}>{STATE_STYLE[t.state].label(t)}</span>
            </Link>
            <button type="button" onClick={() => setLogging({ id: t.id, title: t.title, months: t.months, rule: t.rule })}
              className="shrink-0 rounded-full border-2 border-moss px-3 py-2 text-sm font-semibold text-moss active:scale-95">✓ Log it</button>
          </li>
        ))}
        {tasks.length === 0 && <li className="card p-6 text-center text-sm text-muted md:col-span-2">No recurring upkeep yet. Add a task, or start from the checklist below. 🌿</li>}
      </ul>

      {/* Starter checklist */}
      {suggestions.length > 0 && (
        <section className="card mt-5 p-4">
          <button type="button" onClick={() => setStarterOpen(!starterOpen)} aria-expanded={starterOpen} className="flex w-full items-center justify-between text-left">
            <span className="text-lg font-semibold">🧺 Starter checklist</span>
            <span className="text-sm text-muted">{starterOpen ? "Hide" : `${suggestions.length} ideas`}</span>
          </button>
          {starterOpen && (
            <>
              <p className="mt-1 text-sm text-muted">Common chores most homes need. Tick the ones that apply.</p>
              <ul className="mt-3 space-y-1">
                {suggestions.map((s) => (
                  <li key={s.title}>
                    <label className="flex items-center gap-3 rounded-xl px-2 py-2 hover:bg-moss/5">
                      <input type="checkbox" className="h-5 w-5 accent-[var(--moss)]" checked={picked.includes(s.title)}
                        onChange={(e) => setPicked(e.target.checked ? [...picked, s.title] : picked.filter((x) => x !== s.title))} />
                      <span className="flex-1">{s.title}</span>
                      <span className="text-xs text-muted">{every(s.months)}</span>
                    </label>
                  </li>
                ))}
              </ul>
              <button type="button" onClick={addStarter} disabled={!picked.length || busy} className="btn mt-3 inline-flex disabled:opacity-40">
                {busy ? "Adding…" : `Add ${picked.length || ""} task${picked.length === 1 ? "" : "s"}`}
              </button>
            </>
          )}
        </section>
      )}

      {/* History */}
      <section className="mt-8">
        <h2 className="mb-3 text-xl">📜 History</h2>
        {history.length === 0 ? <p className="card p-5 text-sm text-muted">Nothing logged yet. Each “✓ Log it” lands here — handy records for when you sell.</p> : years.map((y) => {
          const entries = history.filter((h) => h.date.startsWith(y));
          const total = entries.reduce((s, h) => s + (h.cost ?? 0), 0);
          return (
            <div key={y} className="mb-4">
              <div className="mb-1.5 flex items-baseline justify-between px-1 text-sm font-semibold text-muted">
                <span>{y}</span><span>{entries.length} service{entries.length === 1 ? "" : "s"}{total ? ` · ${money(total)}` : ""}</span>
              </div>
              <ul className="card divide-y divide-line overflow-hidden">
                {entries.map((h) => (
                  <li key={h.id}>
                    <Link href={`/projects/${h.projectId}`} className="flex items-start justify-between gap-3 px-4 py-3">
                      <div className="min-w-0">
                        <div className="truncate font-medium">{h.title}</div>
                        <div className="truncate text-xs text-muted">{prettyDate(h.date)}{h.notes ? ` · ${h.notes}` : ""}</div>
                      </div>
                      {h.cost != null && <span className="shrink-0 text-sm text-moss">{money(h.cost)}</span>}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </section>

      <QuickLogSheet task={logging} onClose={() => setLogging(null)} />
      {adding && <NewTaskSheet categories={categories} defaultOwner={defaultOwner} onClose={() => setAdding(false)} />}
    </>
  );
}

/** Quick form for a recurring chore: name, how often, and (optionally) when it was last done. */
function NewTaskSheet({ categories, defaultOwner, onClose }: { categories: { id: string; name: string }[]; defaultOwner: string | null; onClose: () => void }) {
  const router = useRouter();
  const today = new Date().toISOString().slice(0, 10);
  const [title, setTitle] = useState("");
  const [rule, setRule] = useState<Recurrence>(() => defaultRule(today));
  const [category, setCategory] = useState("");
  const [last, setLast] = useState("");
  const [cost, setCost] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setError(null);
    const supabase = createClient();
    const { data, error } = await supabase.from("projects").insert({
      title: title.trim(), status: "Recurring", recurrence: rule, recurrence_months: approxMonths(rule), priority: 2, owner: defaultOwner, seasons: [], category_id: category || null,
    }).select("id").single();
    if (error) { setError(error.message); setBusy(false); return; }
    if (last) {
      const { error: logError } = await supabase.from("service_logs").insert({ project_id: data.id, performed_on: last, cost: cost === "" ? null : Number(cost) });
      if (logError) { setError(logError.message); setBusy(false); return; }
    }
    toast(`Added “${title.trim()}” ✓`);
    onClose(); router.refresh();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center" onClick={() => !busy && onClose()}>
      <form role="dialog" aria-modal="true" aria-labelledby="newtask-title" onSubmit={save} className="card max-h-[85dvh] w-full max-w-md space-y-3 overflow-y-auto p-5" onClick={(e) => e.stopPropagation()}>
        <h2 id="newtask-title" className="text-lg">＋ New upkeep task</h2>
        <label className="block"><span className="mb-1 block text-sm font-medium text-muted">What needs doing?</span>
          <input className="input" required maxLength={120} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Replace HVAC filter" autoFocus /></label>
        <label className="block"><span className="mb-1 block text-sm font-medium text-muted">Category</span>
          <select className="input" value={category} onChange={(e) => setCategory(e.target.value)}>
            <option value="">None</option>
            {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select></label>
        <div><span className="mb-1 block text-sm font-medium text-muted">Repeats</span><RecurrenceEditor value={rule} onChange={setRule} /></div>
        <div className="grid grid-cols-2 gap-3">
          <label className="block"><span className="mb-1 block text-sm font-medium text-muted">Last done (optional)</span>
            <input className="input" type="date" max={today} value={last} onChange={(e) => setLast(e.target.value)} /></label>
          <label className="block"><span className="mb-1 block text-sm font-medium text-muted">Cost then $</span>
            <input className="input" type="number" min="0" step="0.01" inputMode="decimal" value={cost} onChange={(e) => setCost(e.target.value)} disabled={!last} placeholder="0" /></label>
        </div>
        {error && <p className="text-sm text-berry">{error}</p>}
        <div className="flex gap-3">
          <button type="button" onClick={onClose} disabled={busy} className="flex-1 rounded-full border border-line px-4 py-3 font-semibold">Cancel</button>
          <button className="btn inline-flex flex-1" disabled={busy}>{busy ? "Saving…" : "Add task"}</button>
        </div>
      </form>
    </div>
  );
}
