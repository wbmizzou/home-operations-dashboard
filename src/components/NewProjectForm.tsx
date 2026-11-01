"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { DIY_HIRE, OWNERS, PRIORITIES, SEASONS, STATUSES } from "@/lib/constants";

const num = (v: FormDataEntryValue | null) => (v === null || v === "" ? null : Number(v));
const str = (v: FormDataEntryValue | null) => (v === null || String(v).trim() === "" ? null : String(v).trim());

export default function NewProjectForm({ categories, projects }: { categories: { id: string; name: string }[]; projects: { id: string; title: string }[] }) {
  const router = useRouter();
  const [seasons, setSeasons] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

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

    const { error } = await supabase.from("projects").insert({
      title: str(f.get("title")),
      category_id,
      priority: Number(f.get("priority")),
      seasons,
      diy_hire: str(f.get("diy_hire")),
      owner: str(f.get("owner")),
      status: f.get("status"),
      target_date: str(f.get("target_date")),
      target_note: str(f.get("target_note")),
      notes: str(f.get("notes")),
      estimated_cost: num(f.get("estimated_cost")),
      quoted_cost: num(f.get("quoted_cost")),
      actual_cost: num(f.get("actual_cost")),
      blocked_by: str(f.get("blocked_by")),
      recurrence_months: num(f.get("recurrence_months")),
    });
    if (error) { setError(error.message); setBusy(false); return; }
    router.push("/"); router.refresh();
  }

  const Label = ({ children }: { children: React.ReactNode }) => <span className="mb-1 block text-sm font-medium text-muted">{children}</span>;

  return (
    <form onSubmit={submit} className="card mt-6 space-y-4 p-5">
      <label className="block"><Label>Project</Label><input name="title" required className="input" placeholder="e.g. Fix carport gutter flooding" /></label>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block"><Label>Category</Label>
          <input name="category" list="cats" className="input" placeholder="Pick or type a new one" />
          <datalist id="cats">{categories.map((c) => <option key={c.id} value={c.name} />)}</datalist>
        </label>
        <label className="block"><Label>Status</Label>
          <select name="status" className="input" defaultValue="Not Started">{STATUSES.map((s) => <option key={s}>{s}</option>)}</select></label>
        <label className="block"><Label>Priority</Label>
          <select name="priority" className="input" defaultValue={3}>{PRIORITIES.map((p) => <option key={p.value} value={p.value}>{p.label} · {p.focus}</option>)}</select></label>
        <label className="block"><Label>Owner</Label>
          <select name="owner" className="input" defaultValue="Joint">{OWNERS.map((o) => <option key={o}>{o}</option>)}</select></label>
        <label className="block"><Label>DIY / Hire</Label>
          <select name="diy_hire" className="input" defaultValue=""><option value="">—</option>{DIY_HIRE.map((o) => <option key={o}>{o}</option>)}</select></label>
        <label className="block"><Label>Blocked by</Label>
          <select name="blocked_by" className="input" defaultValue=""><option value="">Nothing</option>{projects.map((p) => <option key={p.id} value={p.id}>{p.title}</option>)}</select></label>
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
        <label className="block"><Label>Target date</Label><input name="target_date" type="date" className="input" /></label>
        <label className="block"><Label>Target note</Label><input name="target_note" className="input" placeholder="e.g. After drainage" /></label>
      </div>

      <div className="grid grid-cols-3 gap-3">
        {[["estimated_cost", "Estimated $"], ["quoted_cost", "Quoted $"], ["actual_cost", "Actual $"]].map(([n, l]) => (
          <label key={n} className="block"><Label>{l}</Label><input name={n} type="number" min="0" step="0.01" inputMode="decimal" className="input" /></label>
        ))}
      </div>

      <label className="block"><Label>Repeats every (months) — for recurring maintenance</Label>
        <input name="recurrence_months" type="number" min="1" inputMode="numeric" className="input" placeholder="e.g. 12" /></label>
      <label className="block"><Label>Notes</Label><textarea name="notes" rows={3} className="input" /></label>

      {error && <p className="text-sm text-berry">{error}</p>}
      <button className="btn w-full md:w-auto" disabled={busy}>{busy ? "Saving…" : "Save project"}</button>
    </form>
  );
}
