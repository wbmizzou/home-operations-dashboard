"use client";
import { useRouter } from "next/navigation";
import { createContext, useContext, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { toast } from "@/lib/toast";
import { friendlyError } from "@/lib/errors";
import { STATUSES } from "@/lib/constants";
import { priorityName, type PriorityLevel } from "@/lib/priorities";

type Bulk = { selecting: boolean; selected: Set<string>; toggle: (id: string) => void; start: () => void; stop: () => void };
const Ctx = createContext<Bulk | null>(null);
/** Selection state for the project list, or null outside a <BulkSelect>. */
export const useBulk = () => useContext(Ctx);

export type BulkOptions = {
  categories: { id: string; name: string }[];
  folders: { id: string; name: string }[];
  priorities: PriorityLevel[];
  owners: string[];
  /** The household's statuses, in order. */
  statuses: string[];
  /** Every project id currently shown, for "Select all". */
  visibleIds: string[];
};

type Field = "category_id" | "folder_id" | "priority" | "status" | "owner";
const FIELDS: { key: Field; label: string }[] = [
  { key: "category_id", label: "Category" },
  { key: "folder_id", label: "Folder" },
  { key: "priority", label: "Priority" },
  { key: "status", label: "Status" },
  { key: "owner", label: "Owner" },
];
const today = () => new Date().toISOString().slice(0, 10);
type Row = { id: string; category_id: string | null; folder_id: string | null; priority: number; status: string; owner: string | null; completed_on: string | null };

/** "Select" button for the page header. */
export function SelectButton() {
  const bulk = useBulk();
  if (!bulk) return null;
  return (
    <button type="button" onClick={bulk.selecting ? bulk.stop : bulk.start} aria-pressed={bulk.selecting}
      className={`shrink-0 rounded-full border px-3.5 py-1.5 text-sm font-semibold ${bulk.selecting ? "border-moss bg-moss text-white" : "border-line"}`}>
      {bulk.selecting ? "Done" : "Select"}
    </button>
  );
}

/** Wraps the project list: tap rows to select them, then change a field on all of them at once. */
export default function BulkSelect({ children, options }: { children: React.ReactNode; options: BulkOptions }) {
  const router = useRouter();
  const [selecting, setSelecting] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [sheet, setSheet] = useState(false);
  const [field, setField] = useState<Field>("category_id");
  const [value, setValue] = useState("");
  const [busy, setBusy] = useState(false);

  const value_ = (f: Field) => (f === "priority" ? String(options.priorities[0]?.value ?? 1) : f === "status" ? (options.statuses[0] ?? STATUSES[0]) : "");
  const bulk: Bulk = {
    selecting, selected,
    toggle: (id) => setSelected((s) => { const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); return n; }),
    start: () => { setSelecting(true); setSelected(new Set()); },
    stop: () => { setSelecting(false); setSelected(new Set()); setSheet(false); },
  };
  const ids = [...selected];
  const allShown = options.visibleIds.length > 0 && options.visibleIds.every((id) => selected.has(id));

  function choices(f: Field): { value: string; label: string }[] {
    if (f === "category_id") return [{ value: "", label: "No category" }, ...options.categories.map((c) => ({ value: c.id, label: c.name }))];
    if (f === "folder_id") return [{ value: "", label: "No folder" }, ...options.folders.map((c) => ({ value: c.id, label: c.name }))];
    if (f === "priority") return options.priorities.map((p) => ({ value: String(p.value), label: priorityName(p) }));
    if (f === "status") return options.statuses.map((s) => ({ value: s, label: s }));
    return [{ value: "", label: "Unassigned" }, ...options.owners.map((o) => ({ value: o, label: o }))];
  }

  async function apply() {
    if (!ids.length) return;
    setBusy(true);
    const supabase = createClient();
    // Remember what each project had, for Undo.
    const { data: before, error: readErr } = await supabase.from("projects").select("id, category_id, folder_id, priority, status, owner, completed_on").in("id", ids);
    if (readErr) { setBusy(false); return toast(`Couldn't update: ${friendlyError(readErr)}`); }
    const v = field === "priority" ? Number(value) : value || null;
    let error;
    if (field === "status") {
      // Same rule as the project form: Complete always has a completion date; other statuses clear it.
      ({ error } = await supabase.from("projects").update(value === "Complete" ? { status: value } : { status: value, completed_on: null }).in("id", ids));
      if (!error && value === "Complete") ({ error } = await supabase.from("projects").update({ completed_on: today() }).in("id", ids).is("completed_on", null));
    } else {
      ({ error } = await supabase.from("projects").update({ [field]: v }).in("id", ids));
    }
    setBusy(false);
    if (error) { router.refresh(); return toast(`Couldn't update: ${friendlyError(error)}`); }

    const label = FIELDS.find((x) => x.key === field)!.label.toLowerCase();
    const shown = choices(field).find((c) => c.value === value)?.label ?? value;
    const prev = (before ?? []) as Row[];
    const undo = async () => {
      const db = createClient();
      for (const r of prev) {
        const restore = field === "status" ? { status: r.status, completed_on: r.completed_on } : { [field]: r[field] };
        await db.from("projects").update(restore).eq("id", r.id);
      }
      router.refresh(); toast("Changes undone");
    };
    toast(`Set ${label} to “${shown}” on ${ids.length} project${ids.length === 1 ? "" : "s"} ✓`, { label: "Undo", run: undo });
    bulk.stop(); router.refresh();
  }

  return (
    <Ctx.Provider value={bulk}>
      {children}
      {selecting && (
        <div className="fixed inset-x-3 bottom-[calc(4.75rem+env(safe-area-inset-bottom))] z-40 md:bottom-4 md:left-64">
          <div className="card mx-auto flex max-w-xl items-center gap-2 p-2.5 shadow-lg">
            <button type="button" onClick={() => setSelected(allShown ? new Set() : new Set(options.visibleIds))}
              className="rounded-full px-3 py-2 text-sm font-semibold text-moss underline">{allShown ? "None" : "All"}</button>
            <span className="flex-1 text-sm font-semibold" aria-live="polite">{ids.length} selected</span>
            <button type="button" disabled={!ids.length} onClick={() => { setField("category_id"); setValue(value_("category_id")); setSheet(true); }}
              className="btn inline-flex !px-4 !py-2 text-sm disabled:opacity-40">Change…</button>
          </div>
        </div>
      )}
      {sheet && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center" onClick={() => !busy && setSheet(false)}
          onKeyDown={(e) => { if (e.key === "Escape" && !busy) setSheet(false); }}>
          <div role="dialog" aria-modal="true" aria-labelledby="bulk-title" className="card w-full max-w-sm space-y-4 p-5" onClick={(e) => e.stopPropagation()}>
            <h2 id="bulk-title" className="text-lg">Change {ids.length} project{ids.length === 1 ? "" : "s"}</h2>
            <div>
              <span className="mb-2 block text-sm font-medium text-muted">What to change</span>
              <div className="flex flex-wrap gap-2">
                {FIELDS.map((f) => (
                  <button key={f.key} type="button" onClick={() => { setField(f.key); setValue(value_(f.key)); }} aria-pressed={field === f.key}
                    className={`rounded-full border px-3.5 py-2 text-sm font-semibold ${field === f.key ? "border-moss bg-moss text-white" : "border-line"}`}>{f.label}</button>
                ))}
              </div>
            </div>
            <label className="block"><span className="mb-1 block text-sm font-medium text-muted">Set to</span>
              <select className="input" value={value} onChange={(e) => setValue(e.target.value)}>
                {choices(field).map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
              </select>
            </label>
            <div className="flex gap-3">
              <button type="button" onClick={() => setSheet(false)} disabled={busy} className="flex-1 rounded-full border border-line px-4 py-3 font-semibold">Cancel</button>
              <button type="button" onClick={apply} disabled={busy} className="btn inline-flex flex-1">{busy ? "Updating…" : "Update"}</button>
            </div>
          </div>
        </div>
      )}
    </Ctx.Provider>
  );
}
