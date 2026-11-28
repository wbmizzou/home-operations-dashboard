import Link from "next/link";
import { PIPELINE_STAGES, SEASONS, money, type Project } from "@/lib/constants";
import { priorityName, type PriorityLevel } from "@/lib/priorities";

const q = encodeURIComponent;

export function Card({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <section className="card p-5 md:p-6">
      <h2 className="text-base">{title}</h2>
      {hint && <p className="mt-1 text-xs text-muted">{hint}</p>}
      <div className="mt-4">{children}</div>
    </section>
  );
}

/* Neutral steps for data that isn't the lead; moss marks the one thing that matters. */
const step = (pct: number) => `color-mix(in srgb, var(--ink) ${pct}%, var(--surface))`;

/* 1 · Pipeline: one segmented bar, idea -> in motion. Complete/Recurring excluded.
   Early stages are neutral and darken toward the end; the last stage with work (closest to done) is moss. */
export function PipelineBar({ projects, stages = [...PIPELINE_STAGES] }: { projects: Project[]; stages?: string[] }) {
  const counts = stages.map((s, i) => ({ s, i, n: projects.filter((p) => p.status === s).length }));
  const shown = counts.filter((c) => c.n > 0);
  const total = shown.reduce((a, c) => a + c.n, 0);
  const color = (k: number) => (k === shown.length - 1 ? "var(--moss)" : step(10 + Math.round((k / Math.max(1, shown.length - 1)) * 30)));
  return (
    <Card title="The path so far" hint={`${total} projects in the pipeline · idea → in motion · tap to filter`}>
      <div className="flex h-8 gap-0.5 overflow-hidden rounded-lg">
        {shown.map((c, k) => (
          <Link key={c.s} href={`/projects?status=${q(c.s)}`} title={`${c.s}: ${c.n}`} style={{ flex: c.n, background: color(k) }}
            className="block transition-opacity duration-150 hover:opacity-80" />
        ))}
      </div>
      <ul className="mt-4 flex flex-wrap gap-x-4 gap-y-2 text-xs text-muted">
        {shown.map((c, k) => (
          <li key={c.s}>
            <Link href={`/projects?status=${q(c.s)}`} className="inline-flex items-center gap-1.5 transition-colors duration-150 hover:text-ink">
              <span className="inline-block h-2 w-2 rounded-[2px]" style={{ background: color(k) }} />
              {c.s} <span className="font-medium tabular-nums text-ink">{c.n}</span>
            </Link>
          </li>
        ))}
      </ul>
    </Card>
  );
}

/* 2 · Progress ring */
export function ProgressRing({ done, open, inMotion }: { done: number; open: number; inMotion: number }) {
  const total = done + open;
  const pct = total ? Math.round((done / total) * 100) : 0;
  const R = 48, C = 2 * Math.PI * R;
  return (
    <Card title="How far along are we?" hint="Share of all projects complete">
      <div className="flex items-center gap-6">
        <svg width="112" height="112" viewBox="0 0 112 112" role="img" aria-label={`${pct}% complete`} className="shrink-0">
          <circle cx="56" cy="56" r={R} fill="none" stroke="var(--raised)" strokeWidth="10" />
          <circle cx="56" cy="56" r={R} fill="none" stroke="var(--moss)" strokeWidth="10" strokeLinecap="round"
            strokeDasharray={`${(pct / 100) * C} ${C}`} transform="rotate(-90 56 56)" />
          <text x="56" y="60" textAnchor="middle" fontSize="24" fontWeight="500" fill="var(--ink)" style={{ fontVariantNumeric: "tabular-nums" }}>{pct}%</text>
          <text x="56" y="76" textAnchor="middle" fontSize="11" fill="var(--muted)">complete</text>
        </svg>
        <dl className="space-y-2 text-sm">
          <Stat href="/projects?status=Complete" n={done} label="done" />
          <Stat href="/projects?open=1" n={open} label="open" />
          <Stat href="/projects?status=Scheduled" n={inMotion} label="scheduled / in progress" />
        </dl>
      </div>
    </Card>
  );
}
function Stat({ href, n, label }: { href: string; n: number; label: string }) {
  return (
    <Link href={href} className="flex items-baseline gap-2 transition-colors duration-150 hover:text-ink">
      <span className="w-8 text-right text-xl font-medium tabular-nums text-ink">{n}</span>
      <span className="text-muted">{label}</span>
    </Link>
  );
}

/* 3 · Ranked horizontal bars (used for category and priority). The first row leads in moss. */
export function RankedBars({ title, hint, rows }: { title: string; hint?: string; rows: { key: string; label: string; n: number; href: string; muted?: boolean }[] }) {
  const max = Math.max(1, ...rows.map((r) => r.n));
  return (
    <Card title={title} hint={hint}>
      {rows.length === 0 ? <p className="text-sm text-muted">Nothing open</p> : (
        <ul className="space-y-1">
          {rows.map((r, i) => (
            <li key={r.key}>
              <Link href={r.href} className="-mx-2 grid h-8 grid-cols-[10rem_1fr_2rem] items-center gap-3 rounded-md px-2 text-sm transition-colors duration-150 hover:bg-raised md:grid-cols-[14rem_1fr_2rem]">
                <span className="truncate">{r.label}</span>
                <span className="h-2 rounded-[2px] bg-raised">
                  <span className="block h-full rounded-[2px]" style={{ width: `${(r.n / max) * 100}%`, minWidth: r.n ? 4 : 0, background: r.muted ? step(18) : i === 0 && r.n ? "var(--moss)" : step(32) }} />
                </span>
                <span className="text-right tabular-nums text-muted">{r.n}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

export function priorityRows(open: Project[], levels: PriorityLevel[]) {
  return levels.map((p) => ({
    key: `p${p.value}`, label: priorityName(p), n: open.filter((x) => x.priority === p.value).length,
    href: `/projects?open=1&priority=${p.value}`,
  }));
}

/* 4 · Season x priority heatmap; "Anytime" counts in every season */
export function SeasonHeatmap({ open, levels }: { open: Project[]; levels: PriorityLevel[] }) {
  const seasons = SEASONS.filter((s) => s !== "Anytime");
  // The first four levels, plus any later level that has open work (up to six columns).
  const prios = levels.filter((p, i) => i < 4 || open.some((x) => x.priority === p.value)).slice(0, 6);
  const cell = (s: string, pr: number) => open.filter((p) => p.priority === pr && (p.seasons.includes(s) || p.seasons.includes("Anytime"))).length;
  const max = Math.max(1, ...seasons.flatMap((s) => prios.map((p) => cell(s, p.value))));
  return (
    <Card title="What to tackle when" hint="Open projects by season and priority · darker = more · “Anytime” counts in every season">
      <table className="w-full border-separate text-center" style={{ borderSpacing: 4 }}>
        <thead>
          <tr><th />{prios.map((p) => <th key={p.value} className="pb-1 text-xs font-normal text-muted">{p.label}</th>)}</tr>
        </thead>
        <tbody>
          {seasons.map((s) => (
            <tr key={s}>
              <td className="w-16 pr-2 text-left text-xs text-muted">{s}</td>
              {prios.map((p) => {
                const n = cell(s, p.value);
                const t = n / max;
                return (
                  <td key={p.value} className="p-0">
                    <Link href={`/projects?open=1&priority=${p.value}&season=${s}`} title={`${s} · ${p.label}: ${n}`}
                      className="flex h-10 items-center justify-center rounded-md text-sm font-medium tabular-nums transition-opacity duration-150 hover:opacity-80 md:h-12"
                      style={{ background: n ? `color-mix(in srgb, var(--moss) ${Math.round(12 + t * 68)}%, var(--surface))` : "var(--raised)", color: t > 0.6 ? "var(--on-accent)" : n ? "var(--ink)" : "var(--faint)" }}>
                      {n}
                    </Link>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </Card>
  );
}

/* 5 · Resale value: running total of money invested over time. The main chart on the dashboard.
   The line is drawn in a stretched SVG (non-scaling strokes) and the labels and dots are HTML,
   so text stays the same size on a phone and on a wide screen. */
export type SpendEvent = { date: string; amount: number; label: string };

export function SpendChart({ events, total, completed, now }: { events: SpendEvent[]; total: number; completed: number; now: number }) {
  const sorted = [...events].filter((e) => e.amount > 0).sort((a, b) => a.date.localeCompare(b.date));
  let body: React.ReactNode;
  if (sorted.length === 0) {
    body = (
      <p className="rounded-lg border border-dashed border-line p-4 text-sm text-muted">
        The acorn jar is waiting. Add an actual cost and finish date to a completed project and your running total will grow here.
      </p>
    );
  } else {
    let run = 0;
    const pts: { t: number; v: number; label: string; date: string }[] = [];
    for (const e of sorted) {
      run += e.amount;
      pts.push({ t: new Date(e.date + "T00:00").getTime(), v: run, label: e.label, date: e.date });
    }
    const t0 = pts[0].t - 14 * 864e5, t1 = Math.max(now, pts[pts.length - 1].t) + 7 * 864e5;
    const top = niceMax(run);
    // Percent coordinates: x 0..100 across, y 0..100 down.
    const x = (t: number) => ((t - t0) / (t1 - t0)) * 100;
    const y = (v: number) => 4 + (1 - v / top) * 92;
    let d = `M0 ${y(0)}`;
    for (const p of pts) d += ` H${x(p.t)} V${y(p.v)}`;
    d += ` H100`;
    const area = `${d} V${y(0)} H0 Z`;
    const ticks = [0, 0.5, 1].map((f) => f * top);
    const fmt = (t: number) => new Date(t).toLocaleDateString("en-US", { month: "short", year: "numeric" });
    body = (
      <div className="grid grid-cols-[3rem_1fr] gap-x-3" role="img" aria-label={`Invested ${money(total)}, running total since ${fmt(t0)}`}>
        <div className="relative h-48 md:h-64">
          {ticks.map((v) => (
            <span key={v} className="absolute right-0 -translate-y-1/2 text-xs tabular-nums text-faint" style={{ top: `${y(v)}%` }}>{compact(v)}</span>
          ))}
        </div>
        <div className="relative h-48 md:h-64">
          <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="absolute inset-0 h-full w-full overflow-visible" aria-hidden="true">
            {ticks.map((v) => <line key={v} x1="0" x2="100" y1={y(v)} y2={y(v)} stroke="var(--line)" vectorEffect="non-scaling-stroke" />)}
            <path d={area} fill="var(--moss)" fillOpacity=".08" />
            <path d={d} fill="none" stroke="var(--moss)" strokeWidth="2" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
          </svg>
          {pts.map((p, i) => (
            <span key={i} title={`${p.label} · ${p.date} · running total ${money(p.v)}`}
              className="absolute h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-moss bg-surface"
              style={{ left: `${x(p.t)}%`, top: `${y(p.v)}%` }} />
          ))}
        </div>
        <div />
        <div className="mt-2 flex justify-between text-xs tabular-nums text-faint">
          <span>{fmt(t0)}</span><span>{fmt(t1)}</span>
        </div>
      </div>
    );
  }
  return (
    <Link href="/projects?status=Complete" className="card block p-5 transition-colors duration-150 hover:border-[color-mix(in_srgb,var(--ink)_16%,transparent)] md:p-6">
      <div className="text-sm text-muted">Invested in the cottage</div>
      <div className="font-display mt-1 text-5xl leading-none tabular-nums text-moss">{money(total)}</div>
      <div className="mb-6 mt-2 text-xs text-muted">{completed} completed projects · all-time, counts toward resale value</div>
      {body}
    </Link>
  );
}

function niceMax(v: number) {
  const pow = 10 ** Math.floor(Math.log10(Math.max(v, 1)));
  return Math.ceil(v / pow) * pow;
}
function compact(v: number) {
  return v >= 1000 ? `$${+(v / 1000).toFixed(1)}k` : `$${Math.round(v)}`;
}
