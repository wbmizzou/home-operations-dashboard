"use client";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { softDeleteProject } from "@/lib/projectActions";
import RecurrenceEditor, { defaultRule } from "@/components/RecurrenceEditor";
import { approxMonths, ruleFromMonths, type Recurrence } from "@/lib/rrule";
import { toast } from "@/lib/toast";
import { DIY_HIRE, PRIORITIES, SEASONS, STATUSES, type Project } from "@/lib/constants";

const num = (v: FormDataEntryValue | null) => (v === null || v === "" ? null : Number(v));
const str = (v: FormDataEntryValue | null) => (v === null || String(v).trim() === "" ? null : String(v).trim());
const NEW_CATEGORY = "__new__";
const today = () => new Date().toISOString().slice(0, 10);

type Props = {
  formId?: string;
  hideSubmit?: boolean;
  owners: string[];
  defaultOwner?: string | null;
  /** Anchor for converting an old "every N months" setting into a pattern (last service, or when it was added). */
  seedDate?: string | null;
  categories: { id: string; name: string }[];
  projects: { id: string; title: string }[];
  initial?: Project;
};

export default function ProjectForm({ categories, projects, initial, formId, hideSubmit, owners, defaultOwner, seedDate }: Props) {
  const router = useRouter();
  const [seasons, setSeasons] = useState<string[]>(initial?.seasons ?? []);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [catChoice, setCatChoice] = useState(initial?.category_id ?? "");
  // Repeat pattern: existing tasks with only "every N months" start from an equivalent pattern.
  const initialRule = initial?.recurrence ?? (initial?.recurrence_months ? ruleFromMonths(initial.recurrence_months, seedDate ?? initial.target_date ?? new Date().toISOString().slice(0, 10)) : null);
  const [repeats, setRepeats] = useState(!!initialRule);
  const [rule, setRule] = useState<Recurrence>(initialRule ?? defaultRule());
  const [formKey, setFormKey] = useState(0); // bumped to reset the form after "Save & add another"
  const editing = !!initial;
  const formRef = useRef<HTMLFormElement>(null);

  // Unsaved-changes guard: warn before leaving the page (in-app links or closing/reloading).
  const dirty = useRef(false);
  const markDirty = () => { dirty.current = true; };
  useEffect(() => {
    const LEAVE = "You have unsaved changes. Leave without saving?";
    const onBeforeUnload = (e: BeforeUnloadEvent) => { if (dirty.current) { e.preventDefault(); e.returnValue = ""; } };
    const onClick = (e: MouseEvent) => {
      if (!dirty.current || e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey) return;
      const a = (e.target as Element).closest?.("a[href]") as HTMLAnchorElement | null;
      if (!a || a.target === "_blank" || formRef.current?.contains(a)) return;
      if (!window.confirm(LEAVE)) { e.preventDefault(); e.stopPropagation(); } else dirty.current = false;
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    document.addEventListener("click", onClick, true);
    return () => { window.removeEventListener("beforeunload", onBeforeUnload); document.removeEventListener("click", onClick, true); };
  }, []);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (busy) return;
    const another = (e.nativeEvent as SubmitEvent).submitter?.getAttribute("value") === "another";
    setBusy(true); setError(null);
    const f = new FormData(e.currentTarget);
    const supabase = createClient();

    // Category comes from the dropdown. "New category…" reveals a text box; reuse a
    // matching name (case-insensitive) or create it.
    let category_id: string | null = null;
    if (catChoice === NEW_CATEGORY) {
      const catName = str(f.get("new_category"));
      if (!catName) { setError("Type a name for the new category, or pick one from the list."); setBusy(false); return; }
      const existing = categories.find((c) => c.name.toLowerCase() === catName.toLowerCase());
      if (existing) category_id = existing.id;
      else {
        const { data, error } = await supabase.from("categories").insert({ name: catName }).select("id").single();
        if (error) { setError(error.message); setBusy(false); return; }
        category_id = data.id;
      }
    } else if (catChoice) {
      category_id = catChoice;
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
      recurrence: repeats ? rule : null,
      recurrence_months: repeats ? approxMonths(rule) : null,
      completed_on,
    };

    const { error } = editing
      ? await supabase.from("projects").update(values).eq("id", initial!.id)
      : await supabase.from("projects").insert(values);
    if (error) { setError(error.message); setBusy(false); return; }
    dirty.current = false;
    if (another) {
      // Fresh blank form for the next one.
      toast(`Saved “${values.title}” ✓ — ready for the next one`);
      setSeasons([]); setCatChoice(""); setRepeats(false); setRule(defaultRule()); setFormKey((k) => k + 1); setBusy(false);
      window.scrollTo({ top: 0, behavior: "smooth" });
      router.refresh();
      return;
    }
    toast(editing ? "Saved ✓" : `Added “${values.title}” ✓`);
    router.push(editing ? "/projects" : "/"); router.refresh();
  }

  async function duplicate() {
    if (!initial) return;
    if (dirty.current && !window.confirm("Unsaved changes won't be copied. Duplicate the saved version?")) return;
    setBusy(true);
    const copy = {
      title: `${initial.title} (copy)`, category_id: initial.category_id, priority: initial.priority, seasons: initial.seasons,
      diy_hire: initial.diy_hire, owner: initial.owner, status: "Not Started", target_date: null, target_note: initial.target_note,
      next_action: initial.next_action, notes: initial.notes, estimated_cost: initial.estimated_cost, quoted_cost: null, actual_cost: null,
      blocked_by: initial.blocked_by, recurrence_months: initial.recurrence_months, recurrence: initial.recurrence, completed_on: null,
    };
    const { data, error } = await createClient().from("projects").insert(copy).select("id").single();
    if (error) { setError(error.message); setBusy(false); return; }
    dirty.current = false;
    toast("Duplicated ✓ — you're editing the copy");
    router.push(`/projects/${data.id}`);
  }

  async function remove() {
    if (!initial || !confirm(`Delete “${initial.title}”? You can undo or restore it from Recently deleted for 30 days.`)) return;
    setBusy(true);
    dirty.current = false;
    const err = await softDeleteProject(initial.id, initial.title, router);
    if (err) { setError(err); setBusy(false); return; }
    router.push("/projects");
  }

  const Label = ({ children }: { children: React.ReactNode }) => <span className="mb-1 block text-sm font-medium text-muted">{children}</span>;

  return (
    <form key={formKey} ref={formRef} id={formId} onSubmit={submit} onChange={markDirty} className="card mt-4 space-y-4 p-5">
      {error && (
        <p role="alert" className="sticky top-16 z-20 rounded-xl border border-berry bg-surface p-3 text-sm text-berry shadow">{error}</p>
      )}
      <label className="block"><Label>Project</Label><input name="title" required defaultValue={initial?.title} autoFocus={!editing} className="input" placeholder="e.g. Fix carport gutter flooding" /></label>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="block"><Label>Category</Label>
            <select className="input" value={catChoice} onChange={(e) => setCatChoice(e.target.value)}>
              <option value="">No category</option>
              {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              <option value={NEW_CATEGORY}>＋ New category…</option>
            </select>
          </label>
          {catChoice === NEW_CATEGORY && (
            <input name="new_category" className="input mt-2" placeholder="Name the new category" autoFocus />
          )}
        </div>
        <label className="block"><Label>Status</Label>
          <select name="status" className="input" defaultValue={initial?.status ?? "Not Started"}>{STATUSES.map((s) => <option key={s}>{s}</option>)}</select></label>
        <label className="block"><Label>Priority</Label>
          <select name="priority" className="input" defaultValue={initial?.priority ?? 3}>{PRIORITIES.map((p) => <option key={p.value} value={p.value}>{p.label} · {p.focus}</option>)}</select></label>
        <label className="block"><Label>Owner</Label>
          <select name="owner" className="input" defaultValue={initial ? (initial.owner ?? "") : (defaultOwner ?? "")}><option value="">Unassigned</option>{[...new Set([...owners, ...(initial?.owner ? [initial.owner] : [])])].map((o) => <option key={o}>{o}</option>)}</select></label>
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
              <button type="button" key={s} onClick={() => { markDirty(); setSeasons(on ? seasons.filter((x) => x !== s) : [...seasons, s]); }}
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

      <div>
        <label className="flex items-center gap-2 text-sm font-medium">
          <input type="checkbox" className="h-5 w-5 accent-[var(--moss)]" checked={repeats} onChange={(e) => { markDirty(); setRepeats(e.target.checked); }} />
          🔁 Repeats — recurring upkeep
        </label>
        {repeats && <div className="mt-2"><RecurrenceEditor value={rule} onChange={(r) => { markDirty(); setRule(r); }} /></div>}
      </div>
      <label className="block"><Label>Notes</Label><textarea name="notes" rows={3} defaultValue={initial?.notes ?? ""} className="input" /></label>

      <div className="flex flex-wrap items-center gap-3">
        {!hideSubmit && <button className="btn inline-flex w-full md:w-auto" disabled={busy}>{busy ? "Saving…" : editing ? "Save changes" : "Save project"}</button>}
        {editing && <button type="button" onClick={duplicate} disabled={busy} className="text-sm text-moss underline">Duplicate project</button>}
        {editing && <button type="button" onClick={remove} disabled={busy} className="text-sm text-berry underline">Delete project</button>}
      </div>
    </form>
  );
}
