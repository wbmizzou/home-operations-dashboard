"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { toast } from "@/lib/toast";
import { friendlyError } from "@/lib/errors";
import type { PriorityLevel } from "@/lib/priorities";

/** Settings card: rename, describe, add and remove the household's priority levels. */
export default function PriorityEditor({ levels, isOwner }: { levels: PriorityLevel[]; isOwner: boolean }) {
  const router = useRouter();
  const [rows, setRows] = useState(levels.map((l) => ({ ...l, focus: l.focus ?? "" })));
  const [busy, setBusy] = useState(false);
  const supabase = createClient();
  const changed = rows.some((r) => { const o = levels.find((l) => l.value === r.value); return !o || o.label !== r.label.trim() || (o.focus ?? "") !== r.focus.trim(); });

  async function save() {
    if (rows.some((r) => !r.label.trim())) return toast("Every level needs a name");
    setBusy(true);
    const { error } = await supabase.from("priority_levels").upsert(
      rows.map((r) => ({ level: r.value, label: r.label.trim(), focus: r.focus.trim() || null })),
      { onConflict: "household_id,level" },
    );
    setBusy(false);
    if (error) return toast(`Couldn't save: ${friendlyError(error)}`);
    toast("Priority levels saved ✓"); router.refresh();
  }

  function add() {
    const next = Math.max(0, ...rows.map((r) => r.value)) + 1;
    if (next > 20) return toast("You can have up to 20 priority levels");
    setRows([...rows, { value: next, label: `P${next}`, focus: "" }]);
  }

  async function remove(level: number) {
    const { count } = await supabase.from("projects").select("id", { count: "exact", head: true }).eq("priority", level).is("deleted_at", null);
    if (count) return toast(`${count} project${count === 1 ? " uses" : "s use"} this level — move ${count === 1 ? "it" : "them"} to another level first`);
    if (!levels.some((l) => l.value === level)) { setRows(rows.filter((r) => r.value !== level)); return; } // never saved
    if (!window.confirm("Remove this priority level?")) return;
    const { error } = await supabase.from("priority_levels").delete().eq("level", level);
    if (error) return toast(`Couldn't remove: ${friendlyError(error)}`);
    setRows(rows.filter((r) => r.value !== level));
    toast("Priority level removed ✓"); router.refresh();
  }

  return (
    <section className="card space-y-3 p-5">
      <h2 className="text-lg">🎯 Priority levels</h2>
      <p className="text-sm text-muted">Name your levels however your household thinks about work. The first one is treated as most urgent.{!isOwner && " Only the household owner can remove a level."}</p>
      <ul className="space-y-2">
        {rows.map((r, i) => (
          <li key={r.value} className={`grid items-center gap-2 ${isOwner ? "grid-cols-[5.5rem_1fr_auto]" : "grid-cols-[5.5rem_1fr]"}`}>
            <input className="input" value={r.label} maxLength={20} aria-label={`Level ${i + 1} name`}
              onChange={(e) => setRows(rows.map((x) => (x.value === r.value ? { ...x, label: e.target.value } : x)))} />
            <input className="input" value={r.focus} maxLength={60} placeholder="What it means (optional)" aria-label={`Level ${i + 1} description`}
              onChange={(e) => setRows(rows.map((x) => (x.value === r.value ? { ...x, focus: e.target.value } : x)))} />
            {isOwner && <button type="button" onClick={() => remove(r.value)} aria-label={`Remove ${r.label}`} className="px-1 text-sm text-muted hover:text-berry">✕</button>}
          </li>
        ))}
      </ul>
      <div className="flex flex-wrap items-center gap-3">
        <button type="button" onClick={add} className="rounded-full border-2 border-moss px-4 py-2 text-sm font-semibold text-moss">＋ Add level</button>
        <button type="button" onClick={save} disabled={!changed || busy} className="btn inline-flex disabled:opacity-40">{busy ? "Saving…" : "Save levels"}</button>
      </div>
    </section>
  );
}
