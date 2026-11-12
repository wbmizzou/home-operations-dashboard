import Link from "next/link";
import { Fragment, Suspense } from "react";
import FilterBar, { ClearAllLink } from "@/components/FilterBar";
import ProjectListItem, { type ListProject } from "@/components/ProjectListItem";
import SearchBox from "@/components/SearchBox";
import { createClient } from "@/lib/supabase/server";
import { getHousehold } from "@/lib/household";
import { isRecurring, nextDueDate } from "@/lib/recurrence";
import { STATUS_SORT_ORDER, money, type Project } from "@/lib/constants";

export const dynamic = "force-dynamic";

type Params = { status?: string; category?: string; priority?: string; owner?: string; open?: string; q?: string; season?: string; sort?: string; mine?: string };
const list = (v?: string) => (v ? v.split(",").map((x) => x.trim()).filter(Boolean) : []);
const UUID = /^[0-9a-f-]{36}$/i;
const DUE_SOON_DAYS = 14;

export default async function Projects({ searchParams }: { searchParams: Promise<Params> }) {
  const sp = await searchParams;
  const supabase = await createClient();

  const hh = (await getHousehold())!;
  const [{ data: categories }, { count: deletedCount }] = await Promise.all([
    supabase.from("categories").select("id, name").order("name"),
    supabase.from("projects").select("id", { count: "exact", head: true }).not("deleted_at", "is", null),
  ]);
  const myName = hh.me;

  let query = supabase.from("projects").select("*, categories(name)").is("deleted_at", null);

  const status = list(sp.status);
  if (status.length) query = query.in("status", status);
  // Default view = projects that aren't finished. `open=0` shows everything, and
  // asking for Complete explicitly (e.g. the dashboard) also shows completed ones.
  const includeCompleted = sp.open === "0" || status.includes("Complete");
  if (!includeCompleted) query = query.neq("status", "Complete");

  const priorities = list(sp.priority).map(Number).filter((n) => n >= 1 && n <= 5);
  if (priorities.length) query = query.in("priority", priorities);

  const cats = list(sp.category);
  const catIds = cats.filter((c) => UUID.test(c));
  if (cats.length) {
    const parts = [catIds.length ? `category_id.in.(${catIds.join(",")})` : "", cats.includes("none") ? "category_id.is.null" : ""].filter(Boolean);
    if (parts.length) query = query.or(parts.join(","));
  }

  const owners = list(sp.owner).filter((o) => o === "none" || hh.owners.includes(o));
  if (owners.length) {
    const named = owners.filter((o) => o !== "none");
    const parts = [named.length ? `owner.in.(${named.join(",")})` : "", owners.includes("none") ? "owner.is.null" : ""].filter(Boolean);
    query = query.or(parts.join(","));
  }

  // "Mine" = the signed-in person's projects plus Joint ones.
  const mine = sp.mine === "1" && !!myName;
  if (mine) query = query.in("owner", [myName!, "Joint"]);

  const seasons = list(sp.season).filter((s) => ["Spring", "Summer", "Fall", "Winter"].includes(s));
  if (seasons.length) query = query.overlaps("seasons", [...seasons, "Anytime"]);

  // Search also matches category names.
  const term = sp.q?.replace(/[,()"\\%_*]/g, " ").trim();
  if (term) {
    const matchCats = (categories ?? []).filter((c) => c.name.toLowerCase().includes(term.toLowerCase())).map((c) => c.id);
    const fields = ["title", "notes", "next_action", "target_note"].map((f) => `${f}.ilike."%${term}%"`);
    if (matchCats.length) fields.push(`category_id.in.(${matchCats.join(",")})`);
    query = query.or(fields.join(","));
  }

  switch (sp.sort) {
    case "target": query = query.order("target_date", { ascending: true, nullsFirst: false }).order("priority").order("title"); break;
    case "newest": query = query.order("created_at", { ascending: false }); break;
    case "updated": query = query.order("updated_at", { ascending: false }); break;
    case "name": query = query.order("title"); break;
    default: query = query.order("priority").order("title"); // "priority", and the base order for "status"
  }

  const { data } = await query;
  let projects = (data ?? []) as (Project & { deleted_at: string | null })[];

  // Default sort is by status (a custom order the database can't express), then priority, then name.
  const byStatus = !sp.sort || sp.sort === "status";
  if (byStatus) {
    const rank = (st: string) => { const i = STATUS_SORT_ORDER.indexOf(st as (typeof STATUS_SORT_ORDER)[number]); return i === -1 ? 99 : i; };
    projects = [...projects].sort((a, b) => rank(a.status) - rank(b.status) || a.priority - b.priority || a.title.localeCompare(b.title));
  }

  // Due tags: next service for recurring work, otherwise the target date.
  const recurringIds = projects.filter((p) => isRecurring(p) && p.status !== "Complete").map((p) => p.id);
  const blockerIds = [...new Set(projects.map((p) => p.blocked_by).filter(Boolean))] as string[];
  const [{ data: logs }, { data: blockers }] = await Promise.all([
    recurringIds.length
      ? supabase.from("service_logs").select("project_id, performed_on").in("project_id", recurringIds)
      : Promise.resolve({ data: [] as { project_id: string; performed_on: string }[] }),
    blockerIds.length
      ? supabase.from("projects").select("id, title, status, deleted_at").in("id", blockerIds)
      : Promise.resolve({ data: [] as { id: string; title: string; status: string; deleted_at: string | null }[] }),
  ]);
  const lastService = new Map<string, string>();
  for (const l of logs ?? []) if (!lastService.get(l.project_id) || l.performed_on > lastService.get(l.project_id)!) lastService.set(l.project_id, l.performed_on);
  const openBlocker = new Map((blockers ?? []).filter((b) => b.status !== "Complete" && !b.deleted_at).map((b) => [b.id, b.title]));

  const today = new Date().toISOString().slice(0, 10);
  const soon = new Date(Date.now() + DUE_SOON_DAYS * 864e5).toISOString().slice(0, 10);
  const dueFor = (p: Project): ListProject["due"] => {
    if (p.status === "Complete") return null;
    const date = isRecurring(p) ? nextDueDate(lastService.get(p.id) ?? null, p.recurrence_months, p.target_date, null, p.recurrence) : p.target_date;
    if (!date) return null;
    if (date < today) return { kind: "overdue", date };
    if (date <= soon) return { kind: "soon", date };
    return null;
  };

  // Budget line for whatever is shown.
  const estimate = projects.filter((p) => p.status !== "Complete").reduce((s, p) => s + Number(p.quoted_cost ?? p.estimated_cost ?? 0), 0);
  const spent = projects.filter((p) => p.status === "Complete").reduce((s, p) => s + Number(p.actual_cost ?? 0), 0);

  const filtered = !!(status.length || sp.open === "0" || priorities.length || cats.length || owners.length || seasons.length || term || mine);
  const keep = Object.fromEntries(Object.entries(sp).filter(([, v]) => v !== undefined)) as Record<string, string>;

  return (
    <>
      <header className="flex items-end justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-3xl text-moss">Projects</h1>
          <p className="text-sm text-muted">
            {projects.length} {includeCompleted ? "shown" : "open"}
            {estimate > 0 && <> · est. <b className="text-ink">{money(estimate)}</b></>}
            {spent > 0 && <> · spent <b className="text-ink">{money(spent)}</b></>}
            {term ? ` · “${term}”` : ""}
            {!includeCompleted && <> · <Link href={`/projects?${new URLSearchParams({ ...keep, open: "0" })}`} className="underline">include completed</Link></>}
          </p>
        </div>
        {filtered && <ClearAllLink />}
      </header>
      <div className="mt-4"><Suspense><SearchBox /></Suspense></div>
      <Suspense><FilterBar categories={categories ?? []} me={myName} owners={hh.owners} /></Suspense>

      <ul className="card mt-5 divide-y divide-line overflow-hidden">
        {projects.map((p, i) => {
          const cost = p.actual_cost ?? p.quoted_cost ?? p.estimated_cost;
          const header = byStatus && (i === 0 || projects[i - 1].status !== p.status);
          const due = dueFor(p);
          return (
            <Fragment key={p.id}>
              {header && (
                <li className="bg-moss/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-wide text-muted">
                  {p.status} · {projects.filter((x) => x.status === p.status).length}
                </li>
              )}
              <ProjectListItem p={{
                id: p.id, title: p.title, categoryName: p.categories?.name ?? null, status: p.status, completedOn: p.completed_on,
                owner: p.owner, priority: p.priority, due,
                // The due tag already shows the date; otherwise show a friendly date or the note.
                when: due ? null : p.target_date ? new Date(p.target_date + "T00:00").toLocaleDateString("en-US", { month: "short", day: "numeric", year: p.target_date.slice(0, 4) === today.slice(0, 4) ? undefined : "numeric" }) : p.target_note,
                cost: cost != null ? Number(cost) : null,
                blockedBy: p.blocked_by && p.status !== "Complete" ? openBlocker.get(p.blocked_by) ?? null : null,
              }} />
            </Fragment>
          );
        })}
        {projects.length === 0 && <li className="p-6 text-center text-sm text-muted">Nothing found under these leaves. 🍂 Try fewer words or clear the filters.</li>}
      </ul>

      <p className="mt-6 text-center text-sm">
        <Link href="/projects/deleted" className="text-muted underline">🗑️ Recently deleted{deletedCount ? ` (${deletedCount})` : ""}</Link>
      </p>
    </>
  );
}
