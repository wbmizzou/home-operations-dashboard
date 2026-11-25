import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireHousehold } from "@/lib/household";
import ProjectListItem, { type ListProject } from "@/components/ProjectListItem";
import FolderIcon from "@/components/FolderIcon";
import FolderActions from "@/components/FolderActions";
import { isRecurring, nextDueDate } from "@/lib/recurrence";
import { isoDate } from "@/lib/dates";
import { STATUS_SORT_ORDER, money, type Project } from "@/lib/constants";
import { priorityLabel } from "@/lib/priorities";
import type { Folder } from "@/lib/folders";

export const dynamic = "force-dynamic";
const DUE_SOON_DAYS = 14;

export default async function FolderPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const supabase = await createClient();
  const hh = await requireHousehold();
  const [{ data: folder }, { data: rows }] = await Promise.all([
    supabase.from("folders").select("id, name, color, goal").eq("id", id).maybeSingle(),
    supabase.from("projects").select("*, categories(name)").eq("folder_id", id).is("deleted_at", null),
  ]);
  if (!folder) notFound();
  const f = folder as Folder;

  const rank = (st: string) => { const i = STATUS_SORT_ORDER.indexOf(st as (typeof STATUS_SORT_ORDER)[number]); return i === -1 ? 99 : i; };
  const projects = ((rows ?? []) as Project[]).sort((a, b) => rank(a.status) - rank(b.status) || a.priority - b.priority || a.title.localeCompare(b.title));
  const open = projects.filter((p) => p.status !== "Complete");
  const done = projects.filter((p) => p.status === "Complete");

  // Due tags, as on the Projects list.
  const recurringIds = open.filter((p) => isRecurring(p)).map((p) => p.id);
  const { data: logs } = recurringIds.length
    ? await supabase.from("service_logs").select("project_id, performed_on").in("project_id", recurringIds)
    : { data: [] as { project_id: string; performed_on: string }[] };
  const lastService = new Map<string, string>();
  for (const l of logs ?? []) if (!lastService.get(l.project_id) || l.performed_on > lastService.get(l.project_id)!) lastService.set(l.project_id, l.performed_on);
  const today = isoDate();
  const soon = isoDate(DUE_SOON_DAYS);
  const dueFor = (p: Project): ListProject["due"] => {
    if (p.status === "Complete") return null;
    const date = isRecurring(p) ? nextDueDate(lastService.get(p.id) ?? null, p.recurrence_months, p.target_date, null, p.recurrence) : p.target_date;
    if (!date) return null;
    if (date < today) return { kind: "overdue", date };
    if (date <= soon) return { kind: "soon", date };
    return null;
  };
  const item = (p: Project): ListProject => {
    const cost = p.actual_cost ?? p.quoted_cost ?? p.estimated_cost;
    return {
      id: p.id, title: p.title, categoryName: p.categories?.name ?? null, status: p.status, completedOn: p.completed_on,
      owner: p.owner, priority: p.priority, priorityLabel: priorityLabel(hh.priorities, p.priority), due: dueFor(p),
      when: null, cost: cost != null ? Number(cost) : null, blockedBy: null,
    };
  };

  const left = open.reduce((s, p) => s + Number(p.quoted_cost ?? p.estimated_cost ?? 0), 0);
  const spent = done.reduce((s, p) => s + Number(p.actual_cost ?? 0), 0);
  const pct = projects.length ? Math.round((done.length / projects.length) * 100) : 0;

  return (
    <>
      <Link href="/projects" className="text-sm text-muted">← All projects</Link>
      <section className="card mt-2 space-y-3 p-5">
        <div className="flex items-center gap-3">
          <FolderIcon color={f.color} size={44} />
          <div className="min-w-0 flex-1">
            <h1 className="break-words text-2xl text-ink">{f.name}</h1>
            {f.goal && <p className="text-sm text-muted">{f.goal}</p>}
          </div>
          <FolderActions folder={f} />
        </div>
        <div className="h-2.5 overflow-hidden rounded-full bg-line" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label="Done">
          <div className="h-full rounded-full bg-moss" style={{ width: `${pct}%` }} />
        </div>
        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="rounded-2xl bg-bg px-1 py-2"><div className="text-lg font-bold">{done.length} / {projects.length}</div><div className="text-[11px] text-muted">done</div></div>
          <div className="rounded-2xl bg-bg px-1 py-2"><div className="text-lg font-bold">{left ? money(left) : "—"}</div><div className="text-[11px] text-muted">left to spend</div></div>
          <div className="rounded-2xl bg-bg px-1 py-2"><div className="text-lg font-bold">{spent ? money(spent) : "—"}</div><div className="text-[11px] text-muted">spent</div></div>
        </div>
      </section>

      <h2 className="mt-6 text-lg">Still to do</h2>
      <ul className="card mt-2 divide-y divide-line overflow-hidden">
        {open.map((p) => <ProjectListItem key={p.id} p={item(p)} />)}
        {open.length === 0 && <li className="p-5 text-center text-sm text-muted">{projects.length ? "All done here! 🎉" : "Nothing in this folder yet. Add a project, or pick this folder on any project's page."}</li>}
      </ul>

      {done.length > 0 && (
        <>
          <h2 className="mt-6 text-lg">Done</h2>
          <ul className="card mt-2 divide-y divide-line overflow-hidden">
            {done.map((p) => <ProjectListItem key={p.id} p={item(p)} />)}
          </ul>
        </>
      )}

      <Link href={`/projects/new?folder=${f.id}`} className="btn mt-6 flex w-full justify-center">＋ Add a project to this folder</Link>
    </>
  );
}
