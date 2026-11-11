"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { addMonths, prettyDate } from "@/lib/recurrence";
import { toast } from "@/lib/toast";

export type LogTarget = { id: string; title: string; months: number | null };

/** Bottom sheet to record a completed service: date (today by default), cost, notes. */
export default function QuickLogSheet({ task, onClose }: { task: LogTarget | null; onClose: () => void }) {
  const router = useRouter();
  const today = new Date().toISOString().slice(0, 10);
  const [date, setDate] = useState(today);
  const [cost, setCost] = useState("");
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  if (!task) return null;

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setError(null);
    const supabase = createClient();
    const { error } = await supabase.from("service_logs").insert({
      project_id: task!.id, performed_on: date, cost: cost === "" ? null : Number(cost), notes: notes.trim() || null,
    });
    if (!error) await supabase.from("projects").update({ target_date: null }).eq("id", task!.id); // back on the regular schedule
    setBusy(false);
    if (error) { setError(error.message); return; }
    const next = task!.months ? ` — next due ${prettyDate(addMonths(date, task!.months))}` : "";
    toast(`Logged “${task!.title}” ✓${next}`);
    setCost(""); setNotes(""); setDate(today);
    onClose();
    router.refresh();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center" onClick={() => !busy && onClose()}
      onKeyDown={(e) => { if (e.key === "Escape" && !busy) onClose(); }}>
      <form role="dialog" aria-modal="true" aria-labelledby="qlog-title" onSubmit={save}
        className="card w-full max-w-sm space-y-3 p-5" onClick={(e) => e.stopPropagation()}>
        <h2 id="qlog-title" className="text-lg">✓ Log “{task.title}”</h2>
        <div className="grid grid-cols-2 gap-3">
          <label className="block"><span className="mb-1 block text-sm font-medium text-muted">Done on</span>
            <input className="input" type="date" required value={date} max={today} onChange={(e) => setDate(e.target.value)} /></label>
          <label className="block"><span className="mb-1 block text-sm font-medium text-muted">Cost $</span>
            <input className="input" type="number" min="0" step="0.01" inputMode="decimal" value={cost} onChange={(e) => setCost(e.target.value)} placeholder="0" /></label>
        </div>
        <label className="block"><span className="mb-1 block text-sm font-medium text-muted">Notes</span>
          <input className="input" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Who did it, what they found…" /></label>
        {error && <p className="text-sm text-berry">{error}</p>}
        <div className="flex gap-3">
          <button type="button" onClick={onClose} disabled={busy} className="flex-1 rounded-full border border-line px-4 py-3 font-semibold">Cancel</button>
          <button className="btn inline-flex flex-1" disabled={busy}>{busy ? "Saving…" : "Log it"}</button>
        </div>
      </form>
    </div>
  );
}
