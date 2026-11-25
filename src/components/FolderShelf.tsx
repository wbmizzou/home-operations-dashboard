"use client";
import Link from "next/link";
import { useState } from "react";
import FolderIcon from "@/components/FolderIcon";
import FolderEditor from "@/components/FolderEditor";
import type { Folder } from "@/lib/folders";

export type ShelfFolder = Folder & { done: number; total: number };

/** Folder tiles at the top of Projects, with a tile to make a new folder. */
export default function FolderShelf({ folders }: { folders: ShelfFolder[] }) {
  const [creating, setCreating] = useState(false);
  // No folders yet: a small button instead of a big empty tile.
  if (!folders.length) return (
    <>
      <button type="button" onClick={() => setCreating(true)}
        className="mt-3 rounded-full border-2 border-dashed border-fern px-4 py-2 text-sm font-bold text-moss">＋ New folder</button>
      {creating && <FolderEditor onClose={() => setCreating(false)} />}
    </>
  );
  return (
    <section aria-label="Folders" className="mt-4">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {folders.map((f) => {
          const pct = f.total ? Math.round((f.done / f.total) * 100) : 0;
          return (
            <Link key={f.id} href={`/projects/folders/${f.id}`} className="card flex min-h-[7.5rem] flex-col gap-1.5 p-3.5 active:scale-[.98]">
              <FolderIcon color={f.color} size={32} />
              <span className="line-clamp-2 font-bold leading-tight">{f.name}</span>
              <span className="text-xs text-muted">{f.total ? `${f.done} of ${f.total} done` : "Empty"}</span>
              <span className="mt-auto h-2 overflow-hidden rounded-full bg-line" aria-hidden="true">
                <span className="block h-full rounded-full bg-moss" style={{ width: `${pct}%` }} />
              </span>
            </Link>
          );
        })}
        <button type="button" onClick={() => setCreating(true)}
          className="flex min-h-[7.5rem] flex-col items-center justify-center gap-1 rounded-[1.6rem] border-2 border-dashed border-fern p-3.5 text-sm font-bold text-moss">
          <span className="text-2xl leading-none" aria-hidden="true">＋</span>
          New folder
        </button>
      </div>
      {creating && <FolderEditor onClose={() => setCreating(false)} />}
    </section>
  );
}
