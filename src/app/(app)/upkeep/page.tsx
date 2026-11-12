import { createClient } from "@/lib/supabase/server";
import { requireHousehold } from "@/lib/household";
import { dueInfo, isRecurring } from "@/lib/recurrence";
import { describe, type Recurrence } from "@/lib/rrule";
import UpkeepBoard, { type UpkeepTask, type HistoryEntry } from "@/components/UpkeepBoard";

export const dynamic = "force-dynamic";

const ORDER = { overdue: 0, soon: 1, never: 2, later: 3 } as const;

export default async function Upkeep() {
  const supabase = await createClient();
  const hh = await requireHousehold();
  const [{ data: rows }, { data: logs }, { data: categories }] = await Promise.all([
    supabase.from("projects").select("id, title, status, recurrence_months, recurrence, target_date, created_at, categories(name)").is("deleted_at", null).neq("status", "Complete"),
    supabase.from("service_logs").select("id, project_id, performed_on, cost, notes, projects!inner(title, deleted_at)")
      .is("projects.deleted_at", null).order("performed_on", { ascending: false }),
    supabase.from("categories").select("id, name").order("name"),
  ]);

  const history = ((logs ?? []) as unknown as { id: string; project_id: string; performed_on: string; cost: number | null; notes: string | null; projects: { title: string } }[])
    .map((l): HistoryEntry => ({ id: l.id, projectId: l.project_id, title: l.projects.title, date: l.performed_on, cost: l.cost != null ? Number(l.cost) : null, notes: l.notes }));

  const tasks: UpkeepTask[] = ((rows ?? []) as unknown as { id: string; title: string; status: string; recurrence_months: number | null; recurrence: Recurrence | null; target_date: string | null; created_at: string; categories: { name: string } | null }[])
    .filter(isRecurring)
    .map((p) => {
      const last = history.find((h) => h.projectId === p.id)?.date ?? null;
      const { due, state } = dueInfo(last, p.recurrence_months, p.target_date, p.created_at, p.recurrence);
      const schedule = p.recurrence ? describe(p.recurrence) : p.recurrence_months ? (p.recurrence_months === 12 ? "Every year" : `Every ${p.recurrence_months} months`) : "No schedule set";
      return { id: p.id, title: p.title, months: p.recurrence_months, rule: p.recurrence, schedule, category: p.categories?.name ?? null, last, due, state };
    })
    .sort((a, b) => ORDER[a.state] - ORDER[b.state] || (a.due ?? "").localeCompare(b.due ?? "") || a.title.localeCompare(b.title));

  return (
    <UpkeepBoard tasks={tasks} history={history} categories={categories ?? []}
      existingTitles={tasks.map((t) => t.title)} defaultOwner={hh.members.length > 1 ? "Joint" : hh.me} />
  );
}
