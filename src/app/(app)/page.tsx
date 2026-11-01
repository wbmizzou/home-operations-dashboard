import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { currentSeason, type Project } from "@/lib/constants";
import { PipelineBar, ProgressRing, RankedBars, SeasonHeatmap, SpendChart, priorityRows, type SpendEvent } from "@/components/charts";

export const dynamic = "force-dynamic";

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
    supabase.from("service_logs").select("cost, performed_on, projects(title)"),
  ]);
  const projects = (rows ?? []) as Project[];
  const open = projects.filter((p) => p.status !== "Complete");
  const completed = projects.filter((p) => p.status === "Complete");

  const serviceLogs = (logs ?? []) as unknown as { cost: number | null; performed_on: string; projects: { title: string } | null }[];
  const spent =
    completed.reduce((s, p) => s + Number(p.actual_cost ?? 0), 0) +
    serviceLogs.reduce((s, l) => s + Number(l.cost ?? 0), 0);
  const events: SpendEvent[] = [
    ...completed
      .filter((p) => p.completed_on && Number(p.actual_cost) > 0)
      .map((p) => ({ date: p.completed_on!, amount: Number(p.actual_cost), label: p.title })),
    ...serviceLogs
      .filter((l) => Number(l.cost) > 0)
      .map((l) => ({ date: l.performed_on, amount: Number(l.cost), label: l.projects?.title ?? "Service" })),
  ];

  const catMap = new Map<string, { key: string; label: string; n: number; href: string; muted?: boolean }>();
  for (const p of open) {
    const key = p.category_id ?? "none";
    const e = catMap.get(key) ?? { key, label: p.categories?.name ?? "Uncategorized", n: 0, href: `/projects?open=1&category=${key}`, muted: key === "none" };
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
  const inMotion = open.filter((p) => ["Scheduled", "In Progress"].includes(p.status)).length;

  return (
    <>
      <header className="flex items-end justify-between">
        <div>
          <p className="text-sm text-muted">{season} on the homestead</p>
          <h1 className="text-3xl text-moss md:text-4xl">Dashboard</h1>
        </div>
        <Link href="/projects/new" className="btn hidden md:inline-flex">＋ Add project</Link>
      </header>

      <div className="mt-6 space-y-4">
        <SpendChart events={events} total={spent} completed={completed.length} />
        <div className="grid gap-4 md:grid-cols-2">
          <ProgressRing done={completed.length} open={open.length} inMotion={inMotion} />
          <PipelineBar projects={projects} />
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <RankedBars title="Open by priority" hint="Tap a bar to see the projects" rows={priorityRows(open)} />
          <RankedBars title="Open by category" hint="Longest bar = most open projects" rows={byCategory} />
        </div>
        <SeasonHeatmap open={open} />
      </div>

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
