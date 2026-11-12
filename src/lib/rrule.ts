// Outlook-style recurrence for upkeep tasks.
// Dates are plain "YYYY-MM-DD" strings, handled in local time.

export type Recurrence = {
  freq: "daily" | "weekly" | "monthly" | "yearly";
  interval: number;                 // every N days / weeks / months / years
  weekdaysOnly?: boolean;           // daily: every weekday (Mon–Fri)
  weekdays?: number[];              // weekly: 0 = Sun … 6 = Sat
  mode?: "day" | "nth";             // monthly & yearly: a day of the month, or "the first Monday"
  day?: number;                     // 1–31 (shorter months use their last day)
  nth?: number;                     // 1–4, or -1 for "last"
  nthWeekday?: number;              // 0–6
  month?: number;                   // yearly: 0 = Jan … 11 = Dec
  start: string;                    // first possible date
  end?: { type: "never" } | { type: "after"; count: number } | { type: "on"; date: string };
};

export const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
export const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
export const NTH = [{ v: 1, l: "first" }, { v: 2, l: "second" }, { v: 3, l: "third" }, { v: 4, l: "fourth" }, { v: -1, l: "last" }];

const pad = (n: number) => String(n).padStart(2, "0");
export const ymd = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
export const parseYmd = (s: string) => { const [y, m, d] = s.split("-").map(Number); return new Date(y, m - 1, d); };
const daysIn = (y: number, m: number) => new Date(y, m + 1, 0).getDate();
const addDays = (d: Date, n: number) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);

function nthWeekday(y: number, m: number, nth: number, wd: number): Date | null {
  if (nth === -1) {
    const last = new Date(y, m, daysIn(y, m));
    return addDays(last, -((last.getDay() - wd + 7) % 7));
  }
  const first = new Date(y, m, 1);
  const d = addDays(first, ((wd - first.getDay() + 7) % 7) + (nth - 1) * 7);
  return d.getMonth() === m ? d : null;
}
const dayInMonth = (y: number, m: number, day: number) => new Date(y, m, Math.min(day, daysIn(y, m)));

/** Every occurrence of the pattern in order, honoring the start and end of the series. */
export function* occurrences(r: Recurrence): Generator<string> {
  const start = parseYmd(r.start);
  const iv = Math.max(1, Math.floor(r.interval || 1));
  const endOn = r.end?.type === "on" ? r.end.date : null;
  const max = r.end?.type === "after" ? Math.max(1, r.end.count) : Infinity;
  let count = 0;
  const candidates = function* (): Generator<Date> {
    for (let k = 0; k < 5000; k++) {
      if (r.freq === "daily") {
        if (r.weekdaysOnly) { const d = addDays(start, k); if (d.getDay() !== 0 && d.getDay() !== 6) yield d; }
        else yield addDays(start, k * iv);
      } else if (r.freq === "weekly") {
        const days = [...new Set(r.weekdays?.length ? r.weekdays : [start.getDay()])].sort();
        const weekStart = addDays(start, -start.getDay() + k * iv * 7);
        for (const wd of days) yield addDays(weekStart, wd);
      } else {
        const y = r.freq === "monthly" ? start.getFullYear() + Math.floor((start.getMonth() + k * iv) / 12) : start.getFullYear() + k * iv;
        const m = r.freq === "monthly" ? (start.getMonth() + k * iv) % 12 : (r.month ?? start.getMonth());
        const d = r.mode === "nth" ? nthWeekday(y, m, r.nth ?? 1, r.nthWeekday ?? start.getDay()) : dayInMonth(y, m, r.day ?? start.getDate());
        if (d) yield d;
      }
    }
  };
  for (const d of candidates()) {
    const s = ymd(d);
    if (s < r.start) continue;
    if (endOn && s > endOn) return;
    yield s;
    if (++count >= max) return;
  }
}

/** The first occurrence after `after` (or the first one ever, when nothing has been done yet). Null when the series has ended. */
export function nextOccurrence(r: Recurrence, after: string | null): string | null {
  for (const s of occurrences(r)) if (!after || s > after) return s;
  return null;
}

/** Plain-English summary, e.g. "The first Saturday of every 3 months · until Dec 31, 2027". */
export function describe(r: Recurrence): string {
  const iv = Math.max(1, r.interval || 1);
  const plural = (n: number, unit: string) => (n === 1 ? `every ${unit}` : `every ${n} ${unit}s`);
  const nthText = `the ${NTH.find((n) => n.v === (r.nth ?? 1))?.l} ${WEEKDAYS[r.nthWeekday ?? 0]}`;
  let s: string;
  if (r.freq === "daily") s = r.weekdaysOnly ? "Every weekday" : cap(plural(iv, "day"));
  else if (r.freq === "weekly") {
    const days = (r.weekdays?.length ? [...r.weekdays].sort() : [parseYmd(r.start).getDay()]).map((d) => WEEKDAYS[d].slice(0, 3));
    s = `${cap(plural(iv, "week"))} on ${days.join(", ")}`;
  } else if (r.freq === "monthly") s = r.mode === "nth" ? cap(`${nthText} of ${plural(iv, "month")}`) : `Day ${r.day} of ${plural(iv, "month")}`;
  else {
    const month = MONTHS[r.month ?? 0];
    s = r.mode === "nth" ? cap(`${plural(iv, "year")} on ${nthText} of ${month}`) : cap(`${plural(iv, "year")} on ${month.slice(0, 3)} ${r.day}`);
  }
  if (r.end?.type === "after") s += ` · ${r.end.count} time${r.end.count === 1 ? "" : "s"}`;
  if (r.end?.type === "on") s += ` · until ${parseYmd(r.end.date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`;
  return s;
}
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/** A rough "every N months" for older screens that only understand months. */
export const approxMonths = (r: Recurrence | null) => (!r ? null : r.freq === "monthly" ? r.interval : r.freq === "yearly" ? 12 * r.interval : null);

/** Turn an old "every N months" setting into a pattern starting on `start`. */
export function ruleFromMonths(months: number, start: string): Recurrence {
  const d = parseYmd(start);
  return months % 12 === 0
    ? { freq: "yearly", interval: months / 12, mode: "day", month: d.getMonth(), day: d.getDate(), start, end: { type: "never" } }
    : { freq: "monthly", interval: months, mode: "day", day: d.getDate(), start, end: { type: "never" } };
}
