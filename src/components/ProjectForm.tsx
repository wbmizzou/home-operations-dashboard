"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { DIY_HIRE, OWNERS, PRIORITIES, SEASONS, STATUSES, type Project } from "@/lib/constants";

const num = (v: FormDataEntryValue | null) => (v === null || v === "" ? null : Number(v));
const str = (v: FormDataEntryValue | null) => (v === null || String(v).trim() === "" ? null : String(v).trim());
const today = () => new Date().toISOString().slice(0, 10);

type Props = {
  categories: { id: string; name: string }[];
  projects: { id: string; title: string }[];
  initial?: Project;
};

export default function ProjectForm({ categories, projects, initial }: Props) {
  const router = useRouter();
  const [seasons, setSeasons] = useState<string[]>(initial?.seasons ?? []);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const editing = !!initial;

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true); setError(null);
    const f = new FormData(e.currentTarget);
    const supabase = createClient();

    // Free-text category: reuse an existing one (case-insensitive) or create it.
    let category_id: string | null = null;
    const catName = str(f.get("category"));
    if (catName) {
      const existing = categories.find((c) => c.name.toLowerCase() === catName.toLowerCase());
      if (existing) category_id = existing.id;
      else {
        const { data, error } = await supabase.from("categories").insert({ name: catName }).select("id").single();
        if (error) { setError(error.message); setBusy(false); return; }
        category_id = data.id;
      }
    }

    const status = String(f.get("status"));
    let completed_on = str(f.get("completed_on"));
    // Finished projects always carry a completion date (feeds the resale-value chart).
    if (status === "Complete" && !completed_on) completed_on = today();
    if (status !== "Complete") completed_on = null;

    const values = {
      title: str(f.get("title")),
      category_id,
      priority: Number(f.get("priority")),
      seasons,
      diy_hire: str(f.get("diy_hire")),
      owner: str(f.get("owner")),
      status,
      target_date: str(f.get("target_date")),
      target_note: str(f.get("target_note")),
      next_action: str(f.get("next_action")),
      notes: str(f.get("notes")),
      estimated_cost: num(f.get("estimated_cost")),
      quoted_cost: num(f.get("quoted_cost")),
      actual_cost: num(f.get("actual_cost")),
      blocked_by: str(f.get("blocked_by")),
      recurrence_months: num(f.get("recurrence_months")),
      completed_on,
    };

    const { error } = editing
      ? await supabase.from("projects").update(values).eq("id", initial!.id)
      : await supabase.from("projects").insert(values);
    if (error) { setError(error.message); setBusy(false); return; }
    router.push(editing ? "/projects" : "/"); router.refresh();
  }

  async function remove() {
    if (!initial || !confirm(`Delete “${initial.title}”? This can't be undone.`)) return;
    setBusy(true);
    const { error } = await createClient().from("projects").delete().eq("id", initial.id);
    if (error) { setError(error.message); setBusy(false); return; }
    router.push("/projects"); router.refresh();
  }

  const Label = ({ children }: { children: React.ReactNode }) => <span className="mb-1 block text-sm font-medium text-muted">{children}</span>;
  const catDefault = categories.find((c) => c.id === initial?.category_id)?.name ?? "";

  return (
    <form onSubmit={submit} className="card mt-6 space-y-4 p-5">
      <label className="block"><Label>Project</Label><input name="title" required defaultValue={initial?.title} className="input" placeholder="e.g. Fix carport gutter flooding" /></label>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block"><Label>Category</Label>
          <input name="category" list="cats" defaultValue={catDefault} className="input" placeholder="Pick or type a new one" />
          <datalist id="cats">{categories.map((c) => <option key={c.id} value={c.name} />)}</datalist>
        </label>
        <label className="block"><Label>Status</Label>
          <select name="status" className="input" defaultValue={initial?.status ?? "Not Started"}>{STATUSES.map((s) => <option key={s}>{s}</option>)}</select></label>
        <label className="block"><Label>Priority</Label>
          <select name="priority" className="input" defaultValue={initial?.priority ?? 3}>{PRIORITIES.map((p) => <option key={p.value} value={p.value}>{p.label} · {p.focus}</option>)}</select></label>
        <label className="block"><Label>Owner</Label>
          <select name="owner" className="input" defaultValue={initial ? (initial.owner ?? "") : "Joint"}><option value="">Unassigned</option>{OWNERS.map((o) => <option key={o}>{o}</option>)}</select></label>
        <label className="block"><Label>DIY / Hire</Label>
          <select name="diy_hire" className="input" defaultValue={initial?.diy_hire ?? ""}><option value="">—</option>{DIY_HIRE.map((o) => <option key={o}>{o}</option>)}</select></label>
        <label className="block"><Label>Blocked by</Label>
          <select name="blocked_by" className="input" defaultValue={initial?.blocked_by ?? ""}><option value="">Nothing</option>{projects.filter((p) => p.id !== initial?.id).map((p) => <option key={p.id} value={p.id}>{p.title}</option>)}</select></label>
      </div>

      <div>
        <Label>Best season(s)</Label>
        <div className="flex flex-wrap gap-2">
          {SEASONS.map((s) => {
            const on = seasons.includes(s);
            return (
              <button type="button" key={s} onClick={() => setSeasons(on ? seasons.filter((x) => x !== s) : [...seasons, s])}
                className={`rounded-full border px-4 py-2 text-sm ${on ? "border-moss bg-moss text-white" : "border-line text-muted"}`}>{s}</button>
            );
          })}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block"><Label>Target date</Label><input name="target_date" type="date" defaultValue={initial?.target_date ?? ""} className="input" /></label>
        <label className="block"><Label>Target note</Label><input name="target_note" defaultValue={initial?.target_note ?? ""} className="input" placeholder="e.g. After drainage" /></label>
      </div>

      <label className="block"><Label>Next action</Label><input name="next_action" defaultValue={initial?.next_action ?? ""} className="input" placeholder="What's the very next step?" /></label>

      <div className="grid grid-cols-3 gap-3">
        {([["estimated_cost", "Estimated $", initial?.estimated_cost], ["quoted_cost", "Quoted $", initial?.quoted_cost], ["actual_cost", "Actual $", initial?.actual_cost]] as const).map(([n, l, v]) => (
          <label key={n} className="block"><Label>{l}</Label><input name={n} type="number" min="0" step="0.01" inputMode="decimal" defaultValue={v ?? ""} className="input" /></label>
        ))}
      </div>

      {editing && (
        <label className="block"><Label>Completed on (set automatically when Complete)</Label>
          <input name="completed_on" type="date" defaultValue={initial?.completed_on ?? ""} className="input" /></label>
      )}

      <label className="block"><Label>Repeats every (months) — for recurring maintenance</Label>
        <input name="recurrence_months" type="number" min="1" inputMode="numeric" defaultValue={initial?.recurrence_months ?? ""} className="input" placeholder="e.g. 12" /></label>
      <label className="block"><Label>Notes</Label><textarea name="notes" rows={3} defaultValue={initial?.notes ?? ""} className="input" /></label>

      {error && <p className="text-sm text-berry">{error}</p>}
      <div className="flex flex-wrap items-center gap-3">
        <button className="btn inline-flex w-full md:w-auto" disabled={busy}>{busy ? "Saving…" : editing ? "Save changes" : "Save project"}</button>
        {editing && <button type="button" onClick={remove} disabled={busy} className="text-sm text-berry underline">Delete project</button>}
      </div>
    </form>
  );
}
