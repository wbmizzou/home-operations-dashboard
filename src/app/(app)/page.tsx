import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { STATUSES, PRIORITIES, currentSeason, money, type Project } from "@/lib/constants";

export const dynamic = "force-dynamic";

function Tile({ href, value, label, sub, tone }: { href: string; value: number | string; label: string; sub?: string; tone?: string }) {
  return (
    <Link href={href} className="card block p-4 transition active:scale-[0.98] hover:border-fern">
      <div className={`font-display text-4xl leading-none ${tone ?? "text-moss"}`}>{value}</div>
      <div className="mt-2 text-sm font-medium">{label}</div>
      {sub && <div className="text-xs text-muted">{sub}</div>}
    </Link>
  );
}

function Section({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <section className="mt-8">
      <div className="mb-3 flex items-baseline justify-between">
        <h2 className="text-xl">{title}</h2>
        {hint && <span className="text-xs text-muted">{hint}</span>}
      </div>
      {children}
    </section>
  );
}

function ProjectRow({ p }: { p: Project }) {
  return (
    <li>
      <Link href={`/projects?q=${encodeURIComponent(p.title)}`} className="flex items-center justify-between gap-3 px-4 py-3">
        <div className="min-w-0">
          <div className="truncate font-medium">{p.title}</div>
          <div className="truncate text-xs text-muted">{p.categories?.name ?? "Uncategorized"} · {p.status}</div>
        </div>
        <span className="shrink-0 text-xs text-muted">{p.target_date ? new Date(p.target_date + "T00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" }) : ""}</span>
      </Link>
    </li>
  );
}

export default async function Dashboard() {
  const supabase = await createClient();
  const [{ data: rows }, { data: logs }] = await Promise.all([
    supabase.from("projects").select("*, categories(name)"),
    supabase.from("service_logs").select("cost"),
  ]);
  const projects = (rows ?? []) as Project[];
  const open = projects.filter((p) => p.status !== "Complete");
  const completed = projects.filter((p) => p.status === "Complete");

  const spent =
    completed.reduce((s, p) => s + Number(p.actual_cost ?? 0), 0) +
    (logs ?? []).reduce((s, l) => s + Number(l.cost ?? 0), 0);

  const byStatus = STATUSES.map((s) => ({ s, n: projects.filter((p) => p.status === s).length }));

  const catMap = new Map<string, { id: string; name: string; n: number }>();
  for (const p of open) {
    const key = p.category_id ?? "none";
    const e = catMap.get(key) ?? { id: key, name: p.categories?.name ?? "Uncategorized", n: 0 };
    e.n++; catMap.set(key, e);
  }
  const byCategory = [...catMap.values()].sort((a, b) => b.n - a.n);

  const season = currentSeason();
  const thisSeason = open.filter((p) => p.seasons.includes(season)).sort((a, b) => a.priority - b.priority).slice(0, 6);
  const p1 = open.filter((p) => p.priority === 1);
  const today = new Date().toISOString().slice(0, 10);
  const upcoming = open
    .filter((p) => p.target_date && p.target_date >= today && ["Scheduled", "Planned", "In Progress"].includes(p.status))
    .sort((a, b) => a.target_date!.localeCompare(b.target_date!)).slice(0, 5);

  return (
    <>
      <header className="flex items-end justify-between">
        <div>
          <p className="text-sm text-muted">{season} on the homestead</p>
          <h1 className="text-3xl text-moss md:text-4xl">Dashboard</h1>
        </div>
        <Link href="/projects/new" className="btn hidden md:inline-flex">＋ Add project</Link>
      </header>

      {/* Resale value */}
      <Link href="/projects?status=Complete" className="card mt-6 block overflow-hidden p-5"
        style={{ background: "linear-gradient(135deg, color-mix(in srgb, var(--moss) 22%, var(--surface)), var(--surface))" }}>
        <div className="text-sm text-muted">Invested in improvements</div>
        <div className="font-display text-5xl text-moss">{money(spent)}</div>
        <div className="mt-1 text-xs text-muted">{completed.length} completed projects · all-time, counts toward resale value</div>
      </Link>

      <Section title="Projects by stage" hint={`${projects.length} total · ${open.length} open`}>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {byStatus.map(({ s, n }) => (
            <Tile key={s} href={`/projects?status=${encodeURIComponent(s)}`} value={n} label={s} tone={s === "Complete" ? "text-gold" : undefined} />
          ))}
        </div>
      </Section>

      <Section title="Open by priority">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {PRIORITIES.map((p) => (
            <Tile key={p.value} href={`/projects?open=1&priority=${p.value}`} value={open.filter((x) => x.priority === p.value).length}
              label={p.label} sub={p.focus} tone={p.value === 1 ? "text-berry" : p.value === 2 ? "text-gold" : "text-moss"} />
          ))}
        </div>
      </Section>

      <Section title="Open by category">
        {byCategory.length === 0 ? <p className="text-sm text-muted">No open projects yet.</p> : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {byCategory.map((c) => (
              <Tile key={c.id} href={`/projects?open=1&category=${c.id}`} value={c.n} label={c.name} tone="text-bark" />
            ))}
          </div>
        )}
      </Section>

      <div className="grid gap-0 md:grid-cols-2 md:gap-6">
        <Section title={`This season · ${season}`}>
          <ul className="card divide-y divide-line">
            {thisSeason.length ? thisSeason.map((p) => <ProjectRow key={p.id} p={p} />) : <li className="p-4 text-sm text-muted">Nothing tagged for {season}.</li>}
          </ul>
        </Section>
        <Section title="Protect the house · P1" hint={`${p1.length} open`}>
          <ul className="card divide-y divide-line">
            {p1.length ? p1.map((p) => <ProjectRow key={p.id} p={p} />) : <li className="p-4 text-sm text-muted">No open P1s. 🌿</li>}
          </ul>
        </Section>
      </div>

      <Section title="Coming up">
        <ul className="card divide-y divide-line">
          {upcoming.length ? upcoming.map((p) => <ProjectRow key={p.id} p={p} />) : <li className="p-4 text-sm text-muted">Nothing scheduled with a date.</li>}
        </ul>
      </Section>

      <Link href="/projects/new" aria-label="Add project"
        className="btn fixed flex bottom-20 right-4 z-30 h-14 w-14 !p-0 text-2xl shadow-lg md:hidden">＋</Link>
    </>
  );
}
