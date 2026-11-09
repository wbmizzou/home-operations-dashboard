import Link from "next/link";
import { Fragment, Suspense } from "react";
import FilterBar from "@/components/FilterBar";
import ProjectListItem from "@/components/ProjectListItem";
import SearchBox from "@/components/SearchBox";
import { createClient } from "@/lib/supabase/server";
import { STATUS_SORT_ORDER, type Project } from "@/lib/constants";

export const dynamic = "force-dynamic";

type Params = { status?: string; category?: string; priority?: string; owner?: string; open?: string; q?: string; season?: string; sort?: string };
const list = (v?: string) => (v ? v.split(",").map((x) => x.trim()).filter(Boolean) : []);

export default async function Projects({ searchParams }: { searchParams: Promise<Params> }) {
  const sp = await searchParams;
  const supabase = await createClient();

  let query = supabase.from("projects").select("*, categories(name)");

  const status = list(sp.status);
  if (status.length) query = query.in("status", status);
  // Default view = projects that aren't finished. `open=0` shows everything, and
  // asking for Complete explicitly (e.g. the dashboard) also shows completed ones.
  const includeCompleted = sp.open === "0" || status.includes("Complete");
  if (!includeCompleted) query = query.neq("status", "Complete");

  const priorities = list(sp.priority).map(Number).filter((n) => n >= 1 && n <= 5);
  if (priorities.length) query = query.in("priority", priorities);

  const UUID = /^[0-9a-f-]{36}$/i;
  const cats = list(sp.category);
  const catIds = cats.filter((c) => UUID.test(c));
  if (cats.length) {
    const parts = [catIds.length ? `category_id.in.(${catIds.join(",")})` : "", cats.includes("none") ? "category_id.is.null" : ""].filter(Boolean);
    if (parts.length) query = query.or(parts.join(","));
  }

  const owners = list(sp.owner).filter((o) => ["Will", "Joint", "Natalie", "none"].includes(o));
  if (owners.length) {
    const named = owners.filter((o) => o !== "none");
    const parts = [named.length ? `owner.in.(${named.join(",")})` : "", owners.includes("none") ? "owner.is.null" : ""].filter(Boolean);
    query = query.or(parts.join(","));
  }

  const seasons = list(sp.season).filter((s) => ["Spring", "Summer", "Fall", "Winter"].includes(s));
  if (seasons.length) query = query.overlaps("seasons", [...seasons, "Anytime"]);

  const term = sp.q?.replace(/[,()"\\%_*]/g, " ").trim();
  if (term) query = query.or(`title.ilike."%${term}%",notes.ilike."%${term}%",next_action.ilike."%${term}%",target_note.ilike."%${term}%"`);

  switch (sp.sort) {
    case "target": query = query.order("target_date", { ascending: true, nullsFirst: false }).order("priority").order("title"); break;
    case "newest": query = query.order("created_at", { ascending: false }); break;
    case "updated": query = query.order("updated_at", { ascending: false }); break;
    case "name": query = query.order("title"); break;
    default: query = query.order("priority").order("title"); // "priority", and the base order for "status"
  }

  const { data } = await query;
  let projects = (data ?? []) as Project[];
  // Default sort is by status (a custom order the database can't express), then priority, then name.
  const byStatus = !sp.sort || sp.sort === "status";
  if (byStatus) {
    const rank = (st: string) => { const i = STATUS_SORT_ORDER.indexOf(st as (typeof STATUS_SORT_ORDER)[number]); return i === -1 ? 99 : i; };
    projects = [...projects].sort((a, b) => rank(a.status) - rank(b.status) || a.priority - b.priority || a.title.localeCompare(b.title));
  }
  const filtered = !!(status.length || sp.open === "0" || priorities.length || cats.length || owners.length || seasons.length || term);

  return (
    <>
      <header className="flex items-end justify-between">
        <div>
          <h1 className="text-3xl text-moss">Projects</h1>
          <p className="text-sm text-muted">
            {projects.length} {includeCompleted ? "shown" : "open"}{term ? ` · “${term}”` : ""}
            {!includeCompleted && <> · <Link href={`/projects?${new URLSearchParams({ ...Object.fromEntries(Object.entries(sp).filter(([, v]) => v !== undefined) as [string, string][]), open: "0" })}`} className="underline">include completed</Link></>}
          </p>
        </div>
        {filtered && <Link href="/projects" className="text-sm text-moss underline">Clear all</Link>}
      </header>
      <div className="mt-4"><Suspense><SearchBox /></Suspense></div>
      <Suspense><FilterBar categories={(await supabase.from("categories").select("id, name").order("name")).data ?? []} /></Suspense>

      <ul className="card mt-5 divide-y divide-line overflow-hidden">
        {projects.map((p, i) => {
          const cost = p.actual_cost ?? p.quoted_cost ?? p.estimated_cost;
          const header = byStatus && (i === 0 || projects[i - 1].status !== p.status);
          return (
            <Fragment key={p.id}>
              {header && (
                <li className="bg-moss/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-wide text-muted">
                  {p.status} · {projects.filter((x) => x.status === p.status).length}
                </li>
              )}
              <ProjectListItem p={{
                id: p.id, title: p.title, categoryName: p.categories?.name ?? null, status: p.status, owner: p.owner, priority: p.priority,
                when: p.target_date ?? p.target_note ?? null, cost: cost != null ? Number(cost) : null,
              }} />
            </Fragment>
          );
        })}
        {projects.length === 0 && <li className="p-6 text-center text-sm text-muted">Nothing found under these leaves. 🍂 Try fewer words or clear the filters.</li>}
      </ul>
    </>
  );
}
