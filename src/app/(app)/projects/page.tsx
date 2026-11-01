import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { PRIORITIES, money, type Project } from "@/lib/constants";

export const dynamic = "force-dynamic";

type Params = { status?: string; category?: string; priority?: string; open?: string; q?: string; season?: string };

export default async function Projects({ searchParams }: { searchParams: Promise<Params> }) {
  const sp = await searchParams;
  const supabase = await createClient();
  let query = supabase.from("projects").select("*, categories(name)").order("priority").order("title");
  if (sp.status) query = query.eq("status", sp.status);
  if (sp.open) query = query.neq("status", "Complete");
  if (sp.priority) query = query.eq("priority", Number(sp.priority));
  if (sp.category) sp.category === "none" ? (query = query.is("category_id", null)) : (query = query.eq("category_id", sp.category));
  if (sp.season) query = query.overlaps("seasons", [sp.season, "Anytime"]);
  if (sp.q) query = query.ilike("title", `%${sp.q}%`);
  const { data } = await query;
  const projects = (data ?? []) as Project[];

  const filters = [sp.status, sp.open && "Open", sp.priority && `P${sp.priority}`, sp.category && "Category", sp.season && sp.season].filter(Boolean);

  return (
    <>
      <header className="flex items-end justify-between">
        <div>
          <h1 className="text-3xl text-moss">Projects</h1>
          <p className="text-sm text-muted">{projects.length} shown{filters.length ? ` · ${filters.join(" · ")}` : ""}</p>
        </div>
        {filters.length > 0 || sp.q ? <Link href="/projects" className="text-sm text-moss underline">Clear filters</Link> : null}
      </header>
      <ul className="card mt-6 divide-y divide-line">
        {projects.map((p) => (
          <li key={p.id} className="flex items-center justify-between gap-3 px-4 py-3">
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
          </li>
        ))}
        {projects.length === 0 && <li className="p-6 text-center text-sm text-muted">No projects match.</li>}
      </ul>
    </>
  );
}
