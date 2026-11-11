"use client";
import { MONTHS, NTH, WEEKDAYS, describe, nextOccurrence, parseYmd, type Recurrence } from "@/lib/rrule";
import { prettyDate } from "@/lib/recurrence";

/** A sensible starting pattern: monthly on today's date, from today. */
export function defaultRule(start = new Date().toISOString().slice(0, 10)): Recurrence {
  const d = parseYmd(start);
  return { freq: "monthly", interval: 3, mode: "day", day: d.getDate(), start, end: { type: "never" } };
}

const FREQS: { v: Recurrence["freq"]; l: string }[] = [
  { v: "daily", l: "Daily" }, { v: "weekly", l: "Weekly" }, { v: "monthly", l: "Monthly" }, { v: "yearly", l: "Yearly" },
];

function Num({ value, onChange, max = 99 }: { value: number; onChange: (n: number) => void; max?: number }) {
  return (
    <input type="number" min={1} max={max} inputMode="numeric" value={value || ""} aria-label="Number"
      onChange={(e) => onChange(Math.max(1, Math.min(max, Number(e.target.value) || 1)))}
      className="input !inline-block !w-16 !px-2 !py-1.5 text-center" />
  );
}
function Sel({ value, onChange, options, label }: { value: number; onChange: (n: number) => void; options: { v: number; l: string }[]; label: string }) {
  return (
    <select aria-label={label} value={value} onChange={(e) => onChange(Number(e.target.value))} className="input !inline-block !w-auto !px-2 !py-1.5">
      {options.map((o) => <option key={o.v} value={o.v}>{o.l}</option>)}
    </select>
  );
}
function Radio({ checked, onChange, children }: { checked: boolean; onChange: () => void; children: React.ReactNode }) {
  return (
    <label className="flex flex-wrap items-center gap-2 text-sm">
      <input type="radio" checked={checked} onChange={onChange} className="h-4 w-4 accent-[var(--moss)]" />
      {children}
    </label>
  );
}

/** Outlook-style repeat pattern: Daily / Weekly / Monthly / Yearly, plus a start date and an end. */
export default function RecurrenceEditor({ value, onChange }: { value: Recurrence; onChange: (r: Recurrence) => void }) {
  const r = value;
  const set = (patch: Partial<Recurrence>) => onChange({ ...r, ...patch });
  const start = parseYmd(r.start);
  const wd = WEEKDAYS.map((l, v) => ({ v, l }));
  const months = MONTHS.map((l, v) => ({ v, l }));
  const next = nextOccurrence(r, null);

  function setFreq(freq: Recurrence["freq"]) {
    // Fill in the pieces each pattern needs from the start date, like Outlook does.
    const base = { ...r, freq, interval: 1 };
    if (freq === "weekly") base.weekdays = r.weekdays?.length ? r.weekdays : [start.getDay()];
    if (freq === "monthly" || freq === "yearly") {
      base.mode = r.mode ?? "day"; base.day = r.day ?? start.getDate();
      base.nth = r.nth ?? Math.min(4, Math.ceil(start.getDate() / 7)); base.nthWeekday = r.nthWeekday ?? start.getDay();
    }
    if (freq === "yearly") base.month = r.month ?? start.getMonth();
    onChange(base);
  }

  return (
    <div className="space-y-3 rounded-2xl border border-line p-3">
      {/* Pattern */}
      <div className="grid grid-cols-4 gap-1 rounded-full border border-line p-1" role="radiogroup" aria-label="Repeat pattern">
        {FREQS.map((f) => (
          <button key={f.v} type="button" role="radio" aria-checked={r.freq === f.v} onClick={() => setFreq(f.v)}
            className={`rounded-full py-1.5 text-sm font-semibold ${r.freq === f.v ? "bg-moss text-white" : "text-muted"}`}>{f.l}</button>
        ))}
      </div>

      {r.freq === "daily" && (
        <div className="space-y-2">
          <Radio checked={!r.weekdaysOnly} onChange={() => set({ weekdaysOnly: false })}>Every <Num value={r.interval} onChange={(n) => set({ interval: n, weekdaysOnly: false })} /> day(s)</Radio>
          <Radio checked={!!r.weekdaysOnly} onChange={() => set({ weekdaysOnly: true })}>Every weekday</Radio>
        </div>
      )}

      {r.freq === "weekly" && (
        <div className="space-y-2 text-sm">
          <div className="flex flex-wrap items-center gap-2">Recur every <Num value={r.interval} onChange={(n) => set({ interval: n })} /> week(s) on:</div>
          <div className="flex flex-wrap gap-1.5">
            {WEEKDAYS.map((name, i) => {
              const on = (r.weekdays ?? []).includes(i);
              return (
                <button key={name} type="button" aria-pressed={on} aria-label={name}
                  onClick={() => { const cur = r.weekdays ?? []; const next = on ? cur.filter((x) => x !== i) : [...cur, i]; if (next.length) set({ weekdays: next }); }}
                  className={`h-9 w-9 rounded-full border text-sm font-semibold ${on ? "border-moss bg-moss text-white" : "border-line text-muted"}`}>{name[0]}</button>
              );
            })}
          </div>
        </div>
      )}

      {(r.freq === "monthly" || r.freq === "yearly") && (
        <div className="space-y-2">
          {r.freq === "yearly" && (
            <div className="flex flex-wrap items-center gap-2 text-sm">Recur every <Num value={r.interval} onChange={(n) => set({ interval: n })} /> year(s)</div>
          )}
          <Radio checked={r.mode !== "nth"} onChange={() => set({ mode: "day" })}>
            {r.freq === "monthly" ? <>Day <Num value={r.day ?? 1} max={31} onChange={(n) => set({ day: n, mode: "day" })} /> of every <Num value={r.interval} onChange={(n) => set({ interval: n })} /> month(s)</>
              : <>On <Sel label="Month" value={r.month ?? 0} options={months} onChange={(n) => set({ month: n, mode: "day" })} /> <Num value={r.day ?? 1} max={31} onChange={(n) => set({ day: n, mode: "day" })} /></>}
          </Radio>
          <Radio checked={r.mode === "nth"} onChange={() => set({ mode: "nth" })}>
            The <Sel label="Which week" value={r.nth ?? 1} options={NTH} onChange={(n) => set({ nth: n, mode: "nth" })} />
            <Sel label="Weekday" value={r.nthWeekday ?? 0} options={wd} onChange={(n) => set({ nthWeekday: n, mode: "nth" })} />
            {r.freq === "monthly" ? <>of every <Num value={r.interval} onChange={(n) => set({ interval: n })} /> month(s)</>
              : <>of <Sel label="Month" value={r.month ?? 0} options={months} onChange={(n) => set({ month: n, mode: "nth" })} /></>}
          </Radio>
        </div>
      )}

      {/* Range of recurrence */}
      <div className="space-y-2 border-t border-line pt-3">
        <label className="flex flex-wrap items-center gap-2 text-sm">Start
          <input type="date" required value={r.start} onChange={(e) => e.target.value && set({ start: e.target.value })} className="input !w-auto !py-1.5" /></label>
        <Radio checked={!r.end || r.end.type === "never"} onChange={() => set({ end: { type: "never" } })}>No end date</Radio>
        <Radio checked={r.end?.type === "after"} onChange={() => set({ end: { type: "after", count: r.end?.type === "after" ? r.end.count : 10 } })}>
          End after <Num value={r.end?.type === "after" ? r.end.count : 10} max={999} onChange={(n) => set({ end: { type: "after", count: n } })} /> occurrences
        </Radio>
        <Radio checked={r.end?.type === "on"} onChange={() => set({ end: { type: "on", date: r.end?.type === "on" ? r.end.date : r.start } })}>
          End by <input type="date" value={r.end?.type === "on" ? r.end.date : ""} onChange={(e) => e.target.value && set({ end: { type: "on", date: e.target.value } })} className="input !w-auto !py-1.5" />
        </Radio>
      </div>

      <p className="rounded-xl bg-moss/10 px-3 py-2 text-sm text-moss">
        🔁 {describe(r)}{next ? ` · first ${prettyDate(next)}` : " · no dates in this range"}
      </p>
    </div>
  );
}
