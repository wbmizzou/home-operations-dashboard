import Link from "next/link";
import { Suspense } from "react";
import FilterBar from "@/components/FilterBar";
import SearchBox from "@/components/SearchBox";
import { createClient } from "@/lib/supabase/server";
import { PRIORITIES, money, type Project } from "@/lib/constants";

export const dynamic = "force-dynamic";

type Params = { status?: string; category?: string; priority?: string; owner?: string; open?: string; q?: string; season?: string; sort?: string };
const list = (v?: string) => (v ? v.split(",").map((x) => x.trim()).filter(Boolean) : []);

export default async function Projects({ searchParams }: { searchParams: Promise<Params> }) {
  const sp = await searchParams;
  const supabase = await createClient();

  let query = supabase.from("projects").select("*, categories(name)");

  const status = list(sp.status);
  if (status.length) query = query.in("status", status);
  if (sp.open) query = query.neq("status", "Complete");

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
    default: query = query.order("priority").order("title");
  }

  const { data } = await query;
  const projects = (data ?? []) as Project[];
  const filtered = !!(status.length || sp.open || priorities.length || cats.length || owners.length || seasons.length || term);

  return (
    <>
      <header className="flex items-end justify-between">
        <div>
          <h1 className="text-3xl text-moss">Projects</h1>
          <p className="text-sm text-muted">{projects.length} shown{term ? ` · “${term}”` : ""}</p>
        </div>
        {filtered && <Link href="/projects" className="text-sm text-moss underline">Clear all</Link>}
      </header>
      <div className="mt-4"><Suspense><SearchBox /></Suspense></div>
      <Suspense><FilterBar categories={(await supabase.from("categories").select("id, name").order("name")).data ?? []} /></Suspense>

      <ul className="card mt-5 divide-y divide-line">
        {projects.map((p) => (
          <li key={p.id}>
            <Link href={`/projects/${p.id}`} className="flex items-center justify-between gap-3 px-4 py-3">
              <div className="min-w-0">
                <div className="truncate font-medium">{p.title}</div>
                <div className="truncate text-xs text-muted">
                  {p.categories?.name ?? "Uncategorized"} · {p.status} · {p.owner ?? "Unassigned"}
                  {p.target_date ? ` · ${p.target_date}` : p.target_note ? ` · ${p.target_note}` : ""}
                </div>
              </div>
              <div className="shrink-0 text-right">
                <div className={`text-sm font-semibold ${p.priority === 1 ? "text-berry" : p.priority === 2 ? "text-gold" : "text-moss"}`}>
                  {PRIORITIES.find((x) => x.value === p.priority)?.label}
                </div>
                {(p.actual_cost ?? p.quoted_cost ?? p.estimated_cost) != null && (
                  <div className="text-xs text-muted">{money(Number(p.actual_cost ?? p.quoted_cost ?? p.estimated_cost))}</div>
                )}
              </div>
            </Link>
          </li>
        ))}
        {projects.length === 0 && <li className="p-6 text-center text-sm text-muted">Nothing found under these leaves. 🍂 Try fewer words or clear the filters.</li>}
      </ul>
    </>
  );
}
