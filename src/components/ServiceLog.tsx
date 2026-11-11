"use client";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { money } from "@/lib/constants";
import { nextDueDate } from "@/lib/recurrence";
import { toast } from "@/lib/toast";

export type Log = { id: string; performed_on: string; cost: number | null; notes: string | null };

const fmt = (d: string) => new Date(d + "T00:00").toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

export default function ServiceLog({ projectId, months, logs, target }: { projectId: string; months: number | null; logs: Log[]; target: string | null }) {
  const router = useRouter();
  const today = new Date().toISOString().slice(0, 10);
  const [date, setDate] = useState(today);
  const [cost, setCost] = useState("");
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const last = logs[0]?.performed_on ?? null;
  const due = nextDueDate(last, months, target);
  const future = date > today;
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);

  // Picking a future date here reschedules the task: it becomes the target (next due) date,
  // saved straight away without logging anything.
  async function reschedule(d: string) {
    const { error } = await createClient().from("projects").update({ target_date: d }).eq("id", projectId);
    if (error) { setError(error.message); return; }
    // Keep the project form below in step, so a later "Save changes" doesn't undo this.
    const field = (document.getElementById("project-form") as HTMLFormElement | null)?.elements.namedItem("target_date") as HTMLInputElement | null;
    if (field) field.value = d;
    toast(`Next due set to ${fmt(d)} ✓`);
    router.refresh();
  }
  const overdue = !!due && due < today;
  const total = logs.reduce((s, l) => s + Number(l.cost ?? 0), 0);

  async function add(e: React.FormEvent) {
    e.preventDefault();
    if (future) return; // future dates reschedule instead (handled on change)
    setBusy(true); setError(null);
    const supabase = createClient();
    const { error } = await supabase.from("service_logs").insert({
      project_id: projectId, performed_on: date, cost: cost === "" ? null : Number(cost), notes: notes.trim() || null,
    });
    if (error) { setError(error.message); setBusy(false); return; }
    // A logged service puts the task back on its regular schedule.
    await supabase.from("projects").update({ target_date: null }).eq("id", projectId);
    const field = (document.getElementById("project-form") as HTMLFormElement | null)?.elements.namedItem("target_date") as HTMLInputElement | null;
    if (field) field.value = "";
    setCost(""); setNotes(""); setBusy(false);
    toast("Service logged ✓");
    router.refresh();
  }

  async function remove(id: string) {
    if (!confirm("Remove this service entry?")) return;
    const { error } = await createClient().from("service_logs").delete().eq("id", id);
    if (error) { setError(error.message); return; }
    router.refresh();
  }

  return (
    <section className="card mt-6 p-5">
      <h2 className="text-xl">🔧 Service log</h2>
      <p className="mt-1 text-sm text-muted">
        {months ? `Repeats every ${months} month${months === 1 ? "" : "s"}. ` : "Set “Repeats every (months)” below to track when the next one is due. "}
        {due ? <span className={overdue ? "font-semibold text-berry" : ""}>{overdue ? "Overdue since " : "Next due "}{fmt(due)}.</span> : logs.length === 0 ? "Nothing logged yet." : null}
        {logs.length > 0 && <> Total spent: <b>{money(total)}</b>.</>}
      </p>

      <form onSubmit={add} className="mt-4 grid gap-3 sm:grid-cols-[10rem_8rem_1fr_auto] sm:items-end">
        <label className="block"><span className="mb-1 block text-sm font-medium text-muted">Date</span>
          <input className="input" type="date" required value={date} onChange={(e) => {
            const d = e.target.value;
            setDate(d);
            clearTimeout(timer.current);
            if (d > today) timer.current = setTimeout(() => reschedule(d), 700); // wait for the date wheel to settle
          }} /></label>
        <label className="block"><span className="mb-1 block text-sm font-medium text-muted">Cost $</span>
          <input className="input" type="number" min="0" step="0.01" inputMode="decimal" value={cost} onChange={(e) => setCost(e.target.value)} placeholder="0" /></label>
        <label className="block"><span className="mb-1 block text-sm font-medium text-muted">Notes</span>
          <input className="input" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Who did it, what was found…" /></label>
        <button className="btn inline-flex disabled:opacity-50" disabled={busy || future}>{busy ? "Saving…" : future ? "Set as next due" : "Log service"}</button>
      </form>
      {future && (
        <p className="mt-2 text-sm text-muted">📅 A future date reschedules this task — it&apos;s saved as the next due date. Pick today or an earlier date to log a service instead.</p>
      )}
      {error && <p className="mt-2 text-sm text-berry">{error}</p>}

      {logs.length > 0 && (
        <ul className="mt-4 divide-y divide-line rounded-xl border border-line">
          {logs.map((l) => (
            <li key={l.id} className="flex items-start justify-between gap-3 px-4 py-3 text-sm">
              <div className="min-w-0">
                <div className="font-medium">{fmt(l.performed_on)}{l.cost != null && <span className="ml-2 text-moss">{money(Number(l.cost))}</span>}</div>
                {l.notes && <div className="text-xs text-muted">{l.notes}</div>}
              </div>
              <button onClick={() => remove(l.id)} className="shrink-0 text-xs text-muted underline" aria-label="Remove entry">Remove</button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
