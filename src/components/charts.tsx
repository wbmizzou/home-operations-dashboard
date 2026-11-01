import Link from "next/link";
import { PIPELINE_STAGES, PRIORITIES, SEASONS, money, type Project } from "@/lib/constants";

const q = encodeURIComponent;

export function Card({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <section className="card p-4 md:p-5">
      <h2 className="text-lg md:text-xl">{title}</h2>
      {hint && <p className="mb-3 mt-0.5 text-xs text-muted">{hint}</p>}
      {children}
    </section>
  );
}

/* 1 · Pipeline: one segmented bar, idea -> in motion. Complete/Recurring excluded. */
export function PipelineBar({ projects }: { projects: Project[] }) {
  const counts = PIPELINE_STAGES.map((s, i) => ({ s, i, n: projects.filter((p) => p.status === s).length }));
  const shown = counts.filter((c) => c.n > 0);
  const total = shown.reduce((a, c) => a + c.n, 0);
  return (
    <Card title="Where everything stands" hint={`${total} projects in the pipeline · idea → in motion · tap to filter`}>
      <div className="flex h-9 gap-0.5 overflow-hidden rounded-xl">
        {shown.map((c) => (
          <Link key={c.s} href={`/projects?status=${q(c.s)}`} title={`${c.s}: ${c.n}`} style={{ flex: c.n, background: `var(--r${c.i + 1})` }}
            className="block transition hover:brightness-95" />
        ))}
      </div>
      <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5 text-xs text-muted">
        {shown.map((c) => (
          <li key={c.s}>
            <Link href={`/projects?status=${q(c.s)}`}>
              <span className="mr-1.5 inline-block h-2.5 w-2.5 rounded-sm align-[-1px]" style={{ background: `var(--r${c.i + 1})` }} />
              {c.s} <span className="font-semibold text-ink">{c.n}</span>
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
  const R = 50, C = 2 * Math.PI * R;
  return (
    <Card title="How far along are we?" hint="Share of all projects complete">
      <div className="flex items-center gap-5">
        <svg width="124" height="124" viewBox="0 0 124 124" role="img" aria-label={`${pct}% complete`}>
          <circle cx="62" cy="62" r={R} fill="none" stroke="var(--r1)" strokeWidth="14" />
          <circle cx="62" cy="62" r={R} fill="none" stroke="var(--gold)" strokeWidth="14" strokeLinecap="round"
            strokeDasharray={`${(pct / 100) * C} ${C}`} transform="rotate(-90 62 62)" />
          <text x="62" y="64" textAnchor="middle" fontFamily="Georgia, serif" fontSize="28" fill="var(--ink)">{pct}%</text>
          <text x="62" y="82" textAnchor="middle" fontSize="11" fill="var(--muted)">complete</text>
        </svg>
        <dl className="space-y-1 text-sm">
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
    <Link href={href} className="block">
      <span className="font-display mr-1.5 text-2xl text-moss">{n}</span>
      <span className="text-muted">{label}</span>
    </Link>
  );
}

/* 3 · Ranked horizontal bars (used for category and priority) */
export function RankedBars({ title, hint, rows }: { title: string; hint?: string; rows: { key: string; label: string; n: number; href: string; muted?: boolean }[] }) {
  const max = Math.max(1, ...rows.map((r) => r.n));
  return (
    <Card title={title} hint={hint}>
      {rows.length === 0 ? <p className="text-sm text-muted">Nothing open.</p> : (
        <ul className="space-y-1.5">
          {rows.map((r) => (
            <li key={r.key}>
              <Link href={r.href} className="grid grid-cols-[10.5rem_1fr_1.25rem] items-center gap-2 py-0.5 text-[13px] md:text-sm">
                <span className="truncate">{r.label}</span>
                <span className="h-3.5 rounded-r-full" style={{ background: "var(--r1)" }}>
                  <span className="block h-full rounded-r-full" style={{ width: `${(r.n / max) * 100}%`, minWidth: r.n ? 6 : 0, background: r.muted ? "var(--muted)" : "var(--r7)", opacity: r.muted ? 0.5 : 1 }} />
                </span>
                <span className="text-right text-muted">{r.n}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

export function priorityRows(open: Project[]) {
  return PRIORITIES.map((p) => ({
    key: `p${p.value}`, label: `${p.label} · ${p.focus}`, n: open.filter((x) => x.priority === p.value).length,
    href: `/projects?open=1&priority=${p.value}`,
  }));
}

/* 4 · Season x priority heatmap; "Anytime" counts in every season */
export function SeasonHeatmap({ open }: { open: Project[] }) {
  const seasons = SEASONS.filter((s) => s !== "Anytime");
  const prios = PRIORITIES.filter((p) => p.value <= 4);
  const cell = (s: string, pr: number) => open.filter((p) => p.priority === pr && (p.seasons.includes(s) || p.seasons.includes("Anytime"))).length;
  const max = Math.max(1, ...seasons.flatMap((s) => prios.map((p) => cell(s, p.value))));
  return (
    <Card title="What to tackle when" hint="Open projects by season and priority · darker = more · “Anytime” counts in every season">
      <table className="w-full border-separate text-center" style={{ borderSpacing: 4 }}>
        <thead>
          <tr><th />{prios.map((p) => <th key={p.value} className="pb-1 text-[11px] font-medium text-muted">{p.label}</th>)}</tr>
        </thead>
        <tbody>
          {seasons.map((s) => (
            <tr key={s}>
              <td className="pr-2 text-left text-xs text-muted">{s}</td>
              {prios.map((p) => {
                const n = cell(s, p.value);
                const t = n / max;
                return (
                  <td key={p.value} className="p-0">
                    <Link href={`/projects?open=1&priority=${p.value}&season=${s}`} title={`${s} · ${p.label}: ${n}`}
                      className="font-display flex h-10 items-center justify-center rounded-lg text-base md:h-12"
                      style={{ background: n ? `color-mix(in srgb, var(--moss) ${Math.round(15 + t * 65)}%, var(--surface))` : "var(--r1)", color: t > 0.6 ? "var(--surface)" : n ? "var(--ink)" : "var(--muted)", opacity: n ? 1 : 0.6 }}>
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

/* 5 · Resale value: running total of money invested over time */
export type SpendEvent = { date: string; amount: number; label: string };

export function SpendChart({ events, total, completed }: { events: SpendEvent[]; total: number; completed: number }) {
  const sorted = [...events].filter((e) => e.amount > 0).sort((a, b) => a.date.localeCompare(b.date));
  const W = 360, H = 150, L = 38, Rm = 12, T = 14, B = 24;
  let body: React.ReactNode;
  if (sorted.length === 0) {
    body = (
      <p className="rounded-xl border border-dashed border-line p-4 text-sm text-muted">
        No dated costs yet. Add an actual cost and completion date to a finished project and your running total will plot here.
      </p>
    );
  } else {
    let run = 0;
    const pts = sorted.map((e) => ({ t: new Date(e.date + "T00:00").getTime(), v: (run += e.amount), label: e.label, date: e.date }));
    const t0 = pts[0].t - 14 * 864e5, t1 = Math.max(Date.now(), pts[pts.length - 1].t) + 7 * 864e5;
    const top = niceMax(run);
    const x = (t: number) => L + ((t - t0) / (t1 - t0)) * (W - L - Rm);
    const y = (v: number) => T + (1 - v / top) * (H - T - B);
    let d = `M${x(t0)} ${y(0)}`;
    let prev = 0;
    for (const p of pts) { d += ` L${x(p.t)} ${y(prev)} L${x(p.t)} ${y(p.v)}`; prev = p.v; }
    d += ` L${x(t1)} ${y(prev)}`;
    const area = `${d} L${x(t1)} ${y(0)} Z`;
    const ticks = [0, 0.5, 1].map((f) => f * top);
    body = (
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label={`Invested ${money(total)}`}>
        <defs><linearGradient id="spendFill" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stopColor="var(--moss)" stopOpacity=".35" /><stop offset="1" stopColor="var(--moss)" stopOpacity="0" /></linearGradient></defs>
        {ticks.map((v) => (
          <g key={v}>
            <line x1={L} x2={W - Rm} y1={y(v)} y2={y(v)} stroke="var(--line)" />
            <text x={L - 6} y={y(v) + 3} textAnchor="end" fontSize="9" fill="var(--muted)">{compact(v)}</text>
          </g>
        ))}
        <path d={area} fill="url(#spendFill)" />
        <path d={d} fill="none" stroke="var(--moss)" strokeWidth="2.5" strokeLinejoin="round" />
        {pts.map((p, i) => (
          <circle key={i} cx={x(p.t)} cy={y(p.v)} r="4" fill="var(--surface)" stroke="var(--moss)" strokeWidth="2">
            <title>{`${p.label} · ${p.date} · running total ${money(p.v)}`}</title>
          </circle>
        ))}
        {[t0, t1].map((t, i) => (
          <text key={i} x={x(t)} y={H - 6} textAnchor={i ? "end" : "start"} fontSize="9" fill="var(--muted)">
            {new Date(t).toLocaleDateString("en-US", { month: "short", year: "2-digit" })}
          </text>
        ))}
      </svg>
    );
  }
  return (
    <Link href="/projects?status=Complete" className="card block p-4 md:p-5"
      style={{ background: "linear-gradient(135deg, color-mix(in srgb, var(--moss) 18%, var(--surface)), var(--surface))" }}>
      <div className="text-sm text-muted">Invested in improvements</div>
      <div className="font-display text-5xl text-moss">{money(total)}</div>
      <div className="mb-3 mt-1 text-xs text-muted">{completed} completed projects · all-time, counts toward resale value</div>
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
