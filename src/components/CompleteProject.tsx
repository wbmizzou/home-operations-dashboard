"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { toast } from "@/lib/toast";

export default function CompleteProject({ id, title, defaultCost, open, onClose }: { id: string; title: string; defaultCost: number | null; open: boolean; onClose: () => void }) {
  const router = useRouter();
  const [cost, setCost] = useState(defaultCost != null ? String(defaultCost) : "");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    setBusy(true); setError(null);
    const { error } = await createClient().from("projects").update({
      status: "Complete", completed_on: date, actual_cost: cost === "" ? null : Number(cost),
    }).eq("id", id);
    if (error) { setError(error.message); setBusy(false); return; }
    toast(`“${title}” marked complete ✓`);
    router.push("/"); router.refresh();
  }

  if (!open) return null;
  return (
    <div className="card stitch space-y-3 p-5">
      <h2 className="text-lg">Wrap up “{title}”</h2>
      <div className="grid grid-cols-2 gap-3">
        <label className="block"><span className="mb-1 block text-sm font-medium text-muted">Final cost $</span>
          <input className="input" type="number" min="0" step="0.01" inputMode="decimal" value={cost} onChange={(e) => setCost(e.target.value)} placeholder="0" autoFocus /></label>
        <label className="block"><span className="mb-1 block text-sm font-medium text-muted">Finished on</span>
          <input className="input" type="date" value={date} onChange={(e) => setDate(e.target.value)} /></label>
      </div>
      {error && <p className="text-sm text-berry">{error}</p>}
      <div className="flex items-center gap-3">
        <button onClick={save} disabled={busy} className="btn inline-flex">{busy ? "Saving…" : "Save as complete"}</button>
        <button onClick={onClose} className="text-sm text-muted underline">Cancel</button>
      </div>
    </div>
  );
}
