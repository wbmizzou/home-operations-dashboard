"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { restoreProject } from "@/lib/projectActions";
import { toast } from "@/lib/toast";

const DAY = 864e5;

export default function DeletedList({ items }: { items: { id: string; title: string; deleted_at: string }[] }) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);

  async function forever(id: string, title: string) {
    if (!window.confirm(`Delete “${title}” forever? This can't be undone.`)) return;
    setBusy(id);
    const { error } = await createClient().from("projects").delete().eq("id", id);
    setBusy(null);
    if (error) { toast(`Couldn't delete: ${error.message}`); return; }
    toast(`“${title}” deleted for good`);
    router.refresh();
  }

  if (items.length === 0) return <p className="card mt-5 p-6 text-center text-sm text-muted">Nothing here. Every project is safe and sound. 🌿</p>;
  return (
    <ul className="card mt-5 divide-y divide-line overflow-hidden">
      {items.map((p) => {
        const left = Math.max(0, 30 - Math.floor((Date.now() - new Date(p.deleted_at).getTime()) / DAY));
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
            <button type="button" disabled={busy === p.id} onClick={() => forever(p.id, p.title)} aria-label={`Delete ${p.title} forever`}
              className="rounded-full px-2 py-1.5 text-sm text-berry underline">Forever</button>
          </li>
        );
      })}
    </ul>
  );
}
