"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { PRIORITIES, money } from "@/lib/constants";

export type ListProject = {
  id: string;
  title: string;
  categoryName: string | null;
  status: string;
  owner: string | null;
  priority: number;
  when: string | null;
  cost: number | null;
};

const REVEAL = 96; // px of the red Delete button

/** A project row: swipe left to reveal Delete, which asks "Are you sure?" before deleting. */
export default function ProjectListItem({ p }: { p: ListProject }) {
  const router = useRouter();
  const [offset, setOffset] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const start = useRef<{ x: number; y: number; base: number } | null>(null);
  const moved = useRef(false);
  const rowRef = useRef<HTMLLIElement>(null);

  // Tapping anywhere else closes an open row.
  useEffect(() => {
    if (offset === 0) return;
    const close = (e: PointerEvent) => { if (!rowRef.current?.contains(e.target as Node)) setOffset(0); };
    document.addEventListener("pointerdown", close);
    return () => document.removeEventListener("pointerdown", close);
  }, [offset]);

  function onPointerDown(e: React.PointerEvent) {
    start.current = { x: e.clientX, y: e.clientY, base: offset };
    moved.current = false;
  }
  function onPointerMove(e: React.PointerEvent) {
    const s = start.current;
    if (!s) return;
    const dx = e.clientX - s.x, dy = e.clientY - s.y;
    if (!dragging) {
      if (Math.abs(dx) < 8 || Math.abs(dx) < Math.abs(dy)) return; // vertical scroll or tiny move
      setDragging(true);
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    }
    moved.current = true;
    setOffset(Math.max(-REVEAL, Math.min(0, s.base + dx)));
  }
  function onPointerUp() {
    if (dragging) setOffset(offset < -REVEAL / 2 ? -REVEAL : 0);
    setDragging(false);
    start.current = null;
  }

  async function remove() {
    setBusy(true); setError(null);
    const { error } = await createClient().from("projects").delete().eq("id", p.id);
    if (error) { setError(error.message); setBusy(false); return; }
    setConfirming(false);
    router.refresh();
  }

  const label = PRIORITIES.find((x) => x.value === p.priority)?.label;

  return (
    <li ref={rowRef} className="relative overflow-hidden">
      <button type="button" onClick={() => setConfirming(true)} tabIndex={offset === 0 ? -1 : 0} aria-hidden={offset === 0}
        className="absolute inset-y-0 right-0 flex items-center justify-center bg-berry text-sm font-semibold text-white"
        style={{ width: REVEAL }}>
        🗑️ Delete
      </button>

      <div onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={onPointerUp} onPointerCancel={onPointerUp}
        className="relative bg-surface" style={{ transform: `translateX(${offset}px)`, transition: dragging ? "none" : "transform .2s ease", touchAction: "pan-y" }}>
        <Link href={`/projects/${p.id}`} draggable={false}
          onClick={(e) => { if (moved.current) { e.preventDefault(); moved.current = false; } else if (offset !== 0) { e.preventDefault(); setOffset(0); } }}
          className="flex items-center justify-between gap-3 px-4 py-3">
          <div className="min-w-0">
            <div className="truncate font-medium">{p.title}</div>
            <div className="truncate text-xs text-muted">
              {p.categoryName ?? "Uncategorized"} · {p.status} · {p.owner ?? "Unassigned"}{p.when ? ` · ${p.when}` : ""}
            </div>
          </div>
          <div className="shrink-0 text-right">
            <div className={`text-sm font-semibold ${p.priority === 1 ? "text-berry" : p.priority === 2 ? "text-gold" : "text-moss"}`}>{label}</div>
            {p.cost != null && <div className="text-xs text-muted">{money(p.cost)}</div>}
          </div>
        </Link>
      </div>

      {confirming && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center" onClick={() => !busy && setConfirming(false)}
          onKeyDown={(e) => { if (e.key === "Escape" && !busy) setConfirming(false); }}>
          <div role="alertdialog" aria-modal="true" aria-labelledby={`del-${p.id}`} className="card w-full max-w-sm space-y-3 p-5" onClick={(e) => e.stopPropagation()}>
            <h2 id={`del-${p.id}`} className="text-lg">Are you sure?</h2>
            <p className="text-sm text-muted">“{p.title}” will be permanently deleted, along with any service log entries. This can't be undone.</p>
            {error && <p className="text-sm text-berry">{error}</p>}
            <div className="flex gap-3">
              <button type="button" autoFocus onClick={() => { setConfirming(false); setOffset(0); }} disabled={busy}
                className="flex-1 rounded-full border border-line px-4 py-3 font-semibold">Cancel</button>
              <button type="button" onClick={remove} disabled={busy}
                className="flex-1 rounded-full bg-berry px-4 py-3 font-semibold text-white">{busy ? "Deleting…" : "Yes, delete"}</button>
            </div>
          </div>
        </div>
      )}
    </li>
  );
}
