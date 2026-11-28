"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { toast } from "@/lib/toast";
import { friendlyError } from "@/lib/errors";
import { positionAfter, type StatusDef } from "@/lib/statuses";
import { Lock, Plus, X } from "lucide-react";

type Row = StatusDef & { count: number };

/** Settings card: the built-in statuses (fixed) plus the household's own, which can be added, renamed and removed. */
export default function StatusEditor({ statuses, isOwner }: { statuses: Row[]; isOwner: boolean }) {
  const router = useRouter();
  const [names, setNames] = useState<Record<string, string>>({});
  const [adding, setAdding] = useState("");
  const [after, setAfter] = useState("Waiting");
  const [removing, setRemoving] = useState<string | null>(null);
  const [moveTo, setMoveTo] = useState("Not Started");
  const [busy, setBusy] = useState(false);
  const supabase = createClient();
  const custom = statuses.filter((s) => !s.builtin);
  const nameOf = (s: Row) => names[s.name] ?? s.name;
  const changed = custom.filter((s) => nameOf(s).trim() !== s.name);
  const taken = (name: string, except?: string) => statuses.some((s) => s.name !== except && nameOf(s).trim().toLowerCase() === name.trim().toLowerCase());

  async function save() {
    if (changed.some((s) => !nameOf(s).trim())) return toast("Every status needs a name");
    if (changed.some((s) => taken(nameOf(s), s.name))) return toast("Two statuses can't have the same name");
    setBusy(true);
    for (const s of changed) {
      // Projects follow the rename automatically.
      const { error } = await supabase.from("statuses").update({ name: nameOf(s).trim() }).eq("name", s.name);
      if (error) { setBusy(false); return toast(`Couldn't rename “${s.name}”: ${friendlyError(error)}`); }
    }
    setBusy(false); setNames({});
    toast("Statuses saved"); router.refresh();
  }

  async function add(e: React.FormEvent) {
    e.preventDefault();
    const name = adding.trim();
    if (!name) return;
    if (taken(name)) return toast(`You already have “${name}”`);
    setBusy(true);
    const { error } = await supabase.from("statuses").insert({ name, position: positionAfter(statuses, after) });
    setBusy(false);
    if (error) return toast(`Couldn't add: ${friendlyError(error)}`);
    setAdding("");
    toast(`Added “${name}”`); router.refresh();
  }

  async function remove(s: Row) {
    setBusy(true);
    // Move every project using it first (including ones in Recently deleted).
    const { error: moveErr } = await supabase.from("projects").update({ status: moveTo }).eq("status", s.name);
    if (moveErr) { setBusy(false); return toast(`Couldn't move its projects: ${friendlyError(moveErr)}`); }
    const { data, error } = await supabase.from("statuses").delete().eq("name", s.name).select("name");
    setBusy(false);
    if (error) return toast(`Couldn't remove: ${friendlyError(error)}`);
    if (!data?.length) return toast("Only the household owner can remove a status");
    setRemoving(null);
    toast(s.count ? `Removed “${s.name}” — moved ${s.count} project${s.count === 1 ? "" : "s"} to “${moveTo}”` : `Removed “${s.name}”`);
    router.refresh();
  }

  return (
    <section className="card space-y-3 p-5">
      <h2 className="text-lg">Statuses</h2>
      <p className="text-sm text-muted">
        The built-in statuses (with a lock) always stay. Add your own wherever they fit in the order; rename them any time.
        {!isOwner && " Only the household owner can remove one."}
      </p>
      <ul className="space-y-2">
        {statuses.map((s) => (
          <li key={s.name}>
            {s.builtin ? (
              <div className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm">
                <Lock size={14} strokeWidth={1.5} aria-hidden className="text-faint" />
                <span className="flex-1">{s.name}</span>
                <span className="text-xs text-muted">{s.count} project{s.count === 1 ? "" : "s"}</span>
              </div>
            ) : (
              <div className={`grid items-center gap-2 ${isOwner ? "grid-cols-[1fr_auto_auto]" : "grid-cols-[1fr_auto]"}`}>
                <input className="input" value={nameOf(s)} maxLength={30} aria-label={`Status name: ${s.name}`}
                  onChange={(e) => setNames({ ...names, [s.name]: e.target.value })} />
                <span className="w-16 text-right text-xs text-muted">{s.count} project{s.count === 1 ? "" : "s"}</span>
                {isOwner && (
                  <button type="button" onClick={() => { setRemoving(removing === s.name ? null : s.name); setMoveTo("Not Started"); }}
                    aria-label={`Remove ${s.name}`} aria-expanded={removing === s.name} className="flex h-8 w-8 items-center justify-center rounded-md text-faint transition-colors duration-150 hover:bg-raised hover:text-berry"><X size={16} strokeWidth={1.5} aria-hidden /></button>
                )}
              </div>
            )}
            {removing === s.name && (
              <div className="mt-2 space-y-2 rounded-xl border p-3" style={{ borderColor: "var(--berry)" }}>
                {s.count > 0 ? (
                  <label className="block text-sm">
                    <span className="mb-1 block">Move its {s.count} project{s.count === 1 ? "" : "s"} to:</span>
                    <select className="input" value={moveTo} onChange={(e) => setMoveTo(e.target.value)}>
                      {statuses.filter((x) => x.name !== s.name).map((x) => <option key={x.name}>{x.name}</option>)}
                    </select>
                  </label>
                ) : <p className="text-sm">No projects use “{s.name}”.</p>}
                <div className="flex gap-2">
                  <button type="button" onClick={() => setRemoving(null)} disabled={busy} className="btn-quiet min-h-11 flex-1">Cancel</button>
                  <button type="button" onClick={() => remove(s)} disabled={busy} className="flex-1 rounded-full bg-berry px-3 py-2 text-sm font-medium text-white">
                    {busy ? "Working…" : s.count ? "Move & remove" : "Remove"}
                  </button>
                </div>
              </div>
            )}
          </li>
        ))}
      </ul>
      <form onSubmit={add} className="space-y-2 rounded-2xl bg-bg p-3">
        <input className="input" value={adding} maxLength={30} onChange={(e) => setAdding(e.target.value)} placeholder="New status, e.g. Ordered parts" aria-label="New status name" />
        <div className="flex items-center gap-2">
          <label className="flex min-w-0 flex-1 items-center gap-2 text-sm text-muted">
            <span className="shrink-0">Goes after</span>
            <select className="input" value={after} onChange={(e) => setAfter(e.target.value)}>
              {statuses.map((x) => <option key={x.name}>{x.name}</option>)}
            </select>
          </label>
          <button className="btn-quiet shrink-0" disabled={busy || !adding.trim()}><Plus size={16} strokeWidth={1.75} aria-hidden />Add</button>
        </div>
      </form>
      {custom.length > 0 && (
        <button type="button" onClick={save} disabled={!changed.length || busy} className="btn inline-flex disabled:opacity-40">{busy ? "Saving…" : "Save names"}</button>
      )}
    </section>
  );
}
