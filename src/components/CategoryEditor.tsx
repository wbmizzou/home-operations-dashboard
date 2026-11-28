"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { toast } from "@/lib/toast";
import { friendlyError } from "@/lib/errors";
import { Plus, X } from "lucide-react";

export type CategoryRow = { id: string; name: string; count: number };

/** Settings card: rename, add and remove categories. Removing one that's in use moves its projects first. */
export default function CategoryEditor({ categories, isOwner }: { categories: CategoryRow[]; isOwner: boolean }) {
  const router = useRouter();
  const [names, setNames] = useState<Record<string, string>>(Object.fromEntries(categories.map((c) => [c.id, c.name])));
  const [adding, setAdding] = useState("");
  const [removing, setRemoving] = useState<string | null>(null); // category being removed
  const [moveTo, setMoveTo] = useState("");
  const [busy, setBusy] = useState(false);
  const supabase = createClient();
  const changed = categories.filter((c) => (names[c.id] ?? c.name).trim() !== c.name);
  const dupe = (name: string, except?: string) => categories.some((c) => c.id !== except && (names[c.id] ?? c.name).trim().toLowerCase() === name.trim().toLowerCase());

  async function save() {
    if (changed.some((c) => !names[c.id].trim())) return toast("Every category needs a name");
    if (changed.some((c) => dupe(names[c.id], c.id))) return toast("Two categories can't have the same name");
    setBusy(true);
    for (const c of changed) {
      const { error } = await supabase.from("categories").update({ name: names[c.id].trim() }).eq("id", c.id);
      if (error) { setBusy(false); return toast(`Couldn't save “${names[c.id].trim()}”: ${friendlyError(error)}`); }
    }
    setBusy(false);
    toast("Categories saved"); router.refresh();
  }

  async function add(e: React.FormEvent) {
    e.preventDefault();
    const name = adding.trim();
    if (!name) return;
    if (dupe(name)) return toast(`You already have “${name}”`);
    setBusy(true);
    const { data, error } = await supabase.from("categories").insert({ name }).select("id").single();
    setBusy(false);
    if (error) return toast(`Couldn't add: ${friendlyError(error)}`);
    setNames({ ...names, [data.id]: name }); setAdding("");
    toast(`Added “${name}”`); router.refresh();
  }

  async function remove(c: CategoryRow) {
    setBusy(true);
    if (c.count) {
      // Move every project (including ones in Recently deleted) before the category goes.
      const { error } = await supabase.from("projects").update({ category_id: moveTo || null }).eq("category_id", c.id);
      if (error) { setBusy(false); return toast(`Couldn't move its projects: ${friendlyError(error)}`); }
    }
    const { data, error } = await supabase.from("categories").delete().eq("id", c.id).select("id");
    setBusy(false);
    if (error) return toast(`Couldn't remove: ${friendlyError(error)}`);
    if (!data?.length) return toast("Only the household owner can remove a category");
    const target = categories.find((x) => x.id === moveTo)?.name;
    setRemoving(null); setMoveTo("");
    toast(c.count ? `Removed “${c.name}” — moved ${c.count} project${c.count === 1 ? "" : "s"} to ${target ? `“${target}”` : "No category"}` : `Removed “${c.name}”`);
    router.refresh();
  }

  return (
    <section className="card space-y-3 p-5">
      <h2 className="text-lg">Categories</h2>
      <p className="text-sm text-muted">
        Rename, add or remove categories. Removing one asks where its projects should go, so you can merge two (e.g. Lawn into Landscaping).
        {!isOwner && " Only the household owner can remove a category."}
      </p>
      <ul className="space-y-2">
        {categories.map((c) => (
          <li key={c.id}>
            <div className={`grid items-center gap-2 ${isOwner ? "grid-cols-[1fr_auto_auto]" : "grid-cols-[1fr_auto]"}`}>
              <input className="input" value={names[c.id] ?? c.name} maxLength={40} aria-label={`Category name: ${c.name}`}
                onChange={(e) => setNames({ ...names, [c.id]: e.target.value })} />
              <span className="w-16 text-right text-xs text-muted">{c.count} project{c.count === 1 ? "" : "s"}</span>
              {isOwner && (
                <button type="button" onClick={() => { setRemoving(removing === c.id ? null : c.id); setMoveTo(""); }}
                  aria-label={`Remove ${c.name}`} aria-expanded={removing === c.id} className="flex h-8 w-8 items-center justify-center rounded-md text-faint transition-colors duration-150 hover:bg-raised hover:text-berry"><X size={16} strokeWidth={1.5} aria-hidden /></button>
              )}
            </div>
            {removing === c.id && (
              <div className="mt-2 space-y-2 rounded-xl border p-3" style={{ borderColor: "var(--berry)" }}>
                {c.count > 0 ? (
                  <label className="block text-sm">
                    <span className="mb-1 block">Move its {c.count} project{c.count === 1 ? "" : "s"} to:</span>
                    <select className="input" value={moveTo} onChange={(e) => setMoveTo(e.target.value)}>
                      <option value="">No category</option>
                      {categories.filter((x) => x.id !== c.id).map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}
                    </select>
                  </label>
                ) : <p className="text-sm">No projects use “{c.name}”.</p>}
                <div className="flex gap-2">
                  <button type="button" onClick={() => setRemoving(null)} disabled={busy} className="btn-quiet min-h-11 flex-1">Cancel</button>
                  <button type="button" onClick={() => remove(c)} disabled={busy} className="flex-1 rounded-full bg-berry px-3 py-2 text-sm font-medium text-white">
                    {busy ? "Working…" : c.count ? "Move & remove" : "Remove"}
                  </button>
                </div>
              </div>
            )}
          </li>
        ))}
        {categories.length === 0 && <li className="text-sm text-muted">No categories yet</li>}
      </ul>
      <form onSubmit={add} className="flex gap-2">
        <input className="input" value={adding} maxLength={40} onChange={(e) => setAdding(e.target.value)} placeholder="New category" aria-label="New category name" />
        <button className="btn-quiet shrink-0" disabled={busy || !adding.trim()}><Plus size={16} strokeWidth={1.75} aria-hidden />Add</button>
      </form>
      <button type="button" onClick={save} disabled={!changed.length || busy} className="btn inline-flex disabled:opacity-40">{busy ? "Saving…" : "Save names"}</button>
    </section>
  );
}
