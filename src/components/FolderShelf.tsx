"use client";
import Link from "next/link";
import { useState } from "react";
import FolderIcon from "@/components/FolderIcon";
import FolderEditor from "@/components/FolderEditor";
import type { Folder } from "@/lib/folders";
import { Plus } from "lucide-react";

export type ShelfFolder = Folder & { done: number; total: number };

/** Folder tiles at the top of Projects, with a tile to make a new folder. */
export default function FolderShelf({ folders }: { folders: ShelfFolder[] }) {
  const [creating, setCreating] = useState(false);
  // No folders yet: a small button instead of a big empty tile.
  if (!folders.length) return (
    <>
      <button type="button" onClick={() => setCreating(true)}
        className="btn-quiet mt-3 border-dashed"><Plus size={16} strokeWidth={1.75} aria-hidden />New folder</button>
      {creating && <FolderEditor onClose={() => setCreating(false)} />}
    </>
  );
  return (
    <section aria-label="Folders" className="mt-4">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {folders.map((f) => {
          const pct = f.total ? Math.round((f.done / f.total) * 100) : 0;
          return (
            <Link key={f.id} href={`/projects/folders/${f.id}`} className="card flex min-h-32 flex-col gap-2 p-4 transition-[background-color,transform] duration-150 hover:bg-raised/60 active:scale-[.98]">
              <FolderIcon color={f.color} size={32} />
              <span className="line-clamp-2 font-medium leading-tight">{f.name}</span>
              <span className="text-xs text-muted">{f.total ? `${f.done} of ${f.total} done` : "Empty"}</span>
              <span className="mt-auto h-1.5 overflow-hidden rounded-[2px] bg-raised" aria-hidden="true">
                <span className="block h-full rounded-[2px] bg-moss" style={{ width: `${pct}%` }} />
              </span>
            </Link>
          );
        })}
        <button type="button" onClick={() => setCreating(true)}
          className="flex min-h-32 flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-line p-4 text-sm font-medium text-muted transition-colors duration-150 hover:bg-raised/60 hover:text-ink">
          <Plus size={20} strokeWidth={1.5} aria-hidden />
          New folder
        </button>
      </div>
      {creating && <FolderEditor onClose={() => setCreating(false)} />}
    </section>
  );
}
