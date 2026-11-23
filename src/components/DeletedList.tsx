"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { restoreProject } from "@/lib/projectActions";
import { toast } from "@/lib/toast";
import { friendlyError } from "@/lib/errors";

export default function DeletedList({ items, canDeleteForever }: { items: { id: string; title: string; deleted_at: string; days_left: number }[]; canDeleteForever: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);

  async function forever(id: string, title: string) {
    if (!window.confirm(`Delete “${title}” forever? This can't be undone.`)) return;
    setBusy(id);
    const { data, error } = await createClient().from("projects").delete().eq("id", id).select("id");
    setBusy(null);
    if (error) { toast(`Couldn't delete: ${friendlyError(error)}`); return; }
    if (!data?.length) { toast("Only the household owner can delete a project forever"); return; }
    toast(`“${title}” deleted for good`);
    router.refresh();
  }

  if (items.length === 0) return <p className="card mt-5 p-6 text-center text-sm text-muted">Nothing here. Every project is safe and sound. 🌿</p>;
  return (
    <ul className="card mt-5 divide-y divide-line overflow-hidden">
      {items.map((p) => {
        const left = p.days_left;
        return (
          <li key={p.id} className="flex items-center gap-3 px-4 py-3">
            <div className="min-w-0 flex-1">
              <div className="truncate font-medium">{p.title}</div>
              <div className="text-xs text-muted">
                Deleted {new Date(p.deleted_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })} · {left} day{left === 1 ? "" : "s"} left
              </div>
            </div>
            <button type="button" disabled={busy === p.id} onClick={async () => { setBusy(p.id); await restoreProject(p.id, p.title, router); setBusy(null); }}
              className="rounded-full border-2 border-moss px-3 py-1.5 text-sm font-semibold text-moss">Restore</button>
            {canDeleteForever && (
              <button type="button" disabled={busy === p.id} onClick={() => forever(p.id, p.title)} aria-label={`Delete ${p.title} forever`}
                className="rounded-full px-2 py-1.5 text-sm text-berry underline">Forever</button>
            )}
          </li>
        );
      })}
    </ul>
  );
}
