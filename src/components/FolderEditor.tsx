"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { toast } from "@/lib/toast";
import { friendlyError } from "@/lib/errors";
import { FOLDER_COLORS, isHexColor, type Folder } from "@/lib/folders";
import FolderIcon from "@/components/FolderIcon";

/** Color swatches plus a custom color picker. */
export function ColorPicker({ value, onChange }: { value: string; onChange: (c: string) => void }) {
  const custom = !FOLDER_COLORS.some((c) => c.toLowerCase() === value.toLowerCase());
  return (
    <div role="radiogroup" aria-label="Folder color" className="flex flex-wrap items-center gap-2">
      {FOLDER_COLORS.map((c) => {
        const on = c.toLowerCase() === value.toLowerCase();
        return (
          <button key={c} type="button" role="radio" aria-checked={on} aria-label={`Color ${c}`} onClick={() => onChange(c)}
            className={`h-10 w-10 rounded-full border-2 ${on ? "border-ink ring-2 ring-fern ring-offset-2 ring-offset-[var(--surface)]" : "border-line"}`}
            style={{ background: c }} />
        );
      })}
      <label className={`relative flex h-10 items-center gap-1.5 rounded-full border-2 px-3 text-sm font-semibold ${custom ? "border-ink" : "border-line text-muted"}`}>
        <span className="h-5 w-5 rounded-full border border-line" style={{ background: value }} aria-hidden="true" />
        Custom
        <input type="color" value={isHexColor(value) ? value : "#ffd36e"} onChange={(e) => onChange(e.target.value)}
          className="absolute inset-0 h-full w-full cursor-pointer opacity-0" aria-label="Pick any color" />
      </label>
    </div>
  );
}

/** Sheet to create a folder or rename / recolor / delete one. */
export default function FolderEditor({ folder, onClose, onDeleted }: { folder?: Folder; onClose: () => void; onDeleted?: () => void }) {
  const router = useRouter();
  const [name, setName] = useState(folder?.name ?? "");
  const [color, setColor] = useState<string>(folder?.color ?? FOLDER_COLORS[0]);
  const [goal, setGoal] = useState(folder?.goal ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) { setError("Give the folder a name."); return; }
    setBusy(true); setError(null);
    const supabase = createClient();
    const values = { name: name.trim(), color, goal: goal.trim() || null };
    const { error } = folder
      ? await supabase.from("folders").update(values).eq("id", folder.id)
      : await supabase.from("folders").insert(values);
    setBusy(false);
    if (error) { setError(error.code === "23505" ? "You already have a folder with that name." : friendlyError(error)); return; }
    toast(folder ? "Folder saved ✓" : `Made the “${values.name}” folder ✓`);
    onClose(); router.refresh();
  }

  async function remove() {
    if (!folder || !window.confirm(`Delete the “${folder.name}” folder? Its projects stay in your list, just not in a folder.`)) return;
    setBusy(true);
    const { error } = await createClient().from("folders").delete().eq("id", folder.id);
    setBusy(false);
    if (error) { setError(friendlyError(error)); return; }
    toast("Folder deleted — its projects are still in your list");
    onClose(); onDeleted?.(); router.refresh();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center" onClick={() => !busy && onClose()}
      onKeyDown={(e) => { if (e.key === "Escape" && !busy) onClose(); }}>
      <form role="dialog" aria-modal="true" aria-labelledby="folder-title" onSubmit={save}
        className="card w-full max-w-sm space-y-4 p-5" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-3">
          <FolderIcon color={color} size={36} />
          <h2 id="folder-title" className="text-lg">{folder ? "Edit folder" : "New folder"}</h2>
        </div>
        <label className="block"><span className="mb-1 block text-sm font-medium text-muted">Name</span>
          <input className="input" value={name} maxLength={40} autoFocus onChange={(e) => setName(e.target.value)} placeholder="e.g. Patio & firepit" /></label>
        <div><span className="mb-2 block text-sm font-medium text-muted">Color</span><ColorPicker value={color} onChange={setColor} /></div>
        <label className="block"><span className="mb-1 block text-sm font-medium text-muted">Goal (optional)</span>
          <input className="input" value={goal} maxLength={120} onChange={(e) => setGoal(e.target.value)} placeholder="What's this bigger job for?" /></label>
        {error && <p role="alert" className="text-sm text-berry">{error}</p>}
        <div className="flex gap-3">
          <button type="button" onClick={onClose} disabled={busy} className="flex-1 rounded-full border border-line px-4 py-3 font-semibold">Cancel</button>
          <button className="btn inline-flex flex-1" disabled={busy}>{busy ? "Saving…" : folder ? "Save" : "Make folder"}</button>
        </div>
        {folder && <button type="button" onClick={remove} disabled={busy} className="w-full text-center text-sm text-berry underline">Delete folder (keeps its projects)</button>}
      </form>
    </div>
  );
}
