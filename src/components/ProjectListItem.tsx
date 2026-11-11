"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { PRIORITIES, STATUSES, money } from "@/lib/constants";
import { softDeleteProject } from "@/lib/projectActions";
import { toast } from "@/lib/toast";

export type ListProject = {
  id: string;
  title: string;
  categoryName: string | null;
  status: string;
  completedOn: string | null;
  owner: string | null;
  priority: number;
  when: string | null;
  cost: number | null;
  /** Overdue / due-soon tag, computed on the server (target date, or next service for recurring work). */
  due: { kind: "overdue" | "soon"; date: string } | null;
  /** Title of an unfinished project this one is waiting on. */
  blockedBy: string | null;
};

const REVEAL = 96; // px of the red Delete button
const today = () => new Date().toISOString().slice(0, 10);
const short = (d: string) => new Date(d + "T00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" });

/** A project row: tap the status to change it; swipe left to reveal Delete (with Undo afterwards). */
export default function ProjectListItem({ p }: { p: ListProject }) {
  const router = useRouter();
  const [offset, setOffset] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [statusOpen, setStatusOpen] = useState(false);
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
    const err = await softDeleteProject(p.id, p.title, router);
    if (err) { setError(err); setBusy(false); return; }
    setConfirming(false); setBusy(false); setOffset(0);
  }

  async function changeStatus(next: string) {
    setStatusOpen(false);
    if (next === p.status) return;
    const prev = { status: p.status, completed_on: p.completedOn };
    const values = { status: next, completed_on: next === "Complete" ? (p.completedOn ?? today()) : null };
    const { error } = await createClient().from("projects").update(values).eq("id", p.id);
    if (error) { toast(`Couldn't change status: ${error.message}`); return; }
    router.refresh();
    const undo = { label: "Undo", run: async () => { await createClient().from("projects").update(prev).eq("id", p.id); router.refresh(); toast("Status restored"); } };
    if (next === "Complete") {
      toast(`“${p.title}” complete ✓ — add the final cost?`, { label: "Add cost", run: () => router.push(`/projects/${p.id}`) });
    } else toast(`Moved to ${next} ✓`, undo);
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
        className="relative flex items-center gap-3 bg-surface pr-4" style={{ transform: `translateX(${offset}px)`, transition: dragging ? "none" : "transform .2s ease", touchAction: "pan-y" }}>
        <Link href={`/projects/${p.id}`} draggable={false}
          onClick={(e) => { if (moved.current) { e.preventDefault(); moved.current = false; } else if (offset !== 0) { e.preventDefault(); setOffset(0); } }}
          className="min-w-0 flex-1 py-3 pl-4">
          <div className="truncate font-medium">{p.title}</div>
          <div className="truncate text-xs text-muted">
            {p.categoryName ?? "Uncategorized"} · {p.owner ?? "Unassigned"}{p.when ? ` · ${p.when}` : ""}
          </div>
          {(p.due || p.blockedBy) && (
            <div className="mt-1 flex flex-wrap gap-1.5">
              {p.due && (
                <span className="rounded-full px-2 py-0.5 text-[11px] font-semibold"
                  style={p.due.kind === "overdue"
                    ? { background: "color-mix(in srgb, var(--berry) 18%, transparent)", color: "var(--berry)" }
                    : { background: "color-mix(in srgb, var(--gold) 22%, transparent)", color: "var(--bark)" }}>
                  {p.due.kind === "overdue" ? `⏰ Overdue · ${short(p.due.date)}` : `Due ${short(p.due.date)}`}
                </span>
              )}
              {p.blockedBy && (
                <span className="truncate rounded-full bg-line px-2 py-0.5 text-[11px] font-semibold text-muted">⛔ Waiting on {p.blockedBy}</span>
              )}
            </div>
          )}
        </Link>
        <div className="flex shrink-0 flex-col items-end gap-1 py-2">
          <div className={`text-sm font-semibold ${p.priority === 1 ? "text-berry" : p.priority === 2 ? "text-gold" : "text-moss"}`}>{label}</div>
          <button type="button" onClick={() => { if (!moved.current && offset === 0) setStatusOpen(true); }}
            aria-label={`Status: ${p.status}. Tap to change.`}
            className="rounded-full border border-line px-2.5 py-1 text-[11px] font-semibold text-muted active:scale-95">
            {p.status} ▾
          </button>
          {p.cost != null && <div className="text-[11px] text-muted">{money(p.cost)}</div>}
        </div>
      </div>

      {statusOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center" onClick={() => setStatusOpen(false)}
          onKeyDown={(e) => { if (e.key === "Escape") setStatusOpen(false); }}>
          <div role="dialog" aria-modal="true" aria-labelledby={`st-${p.id}`} className="card w-full max-w-sm p-4" onClick={(e) => e.stopPropagation()}>
            <h2 id={`st-${p.id}`} className="truncate px-1 text-lg">Move “{p.title}” to…</h2>
            <div className="mt-3 grid grid-cols-2 gap-2">
              {STATUSES.map((s) => (
                <button key={s} type="button" onClick={() => changeStatus(s)} autoFocus={s === p.status}
                  className={`rounded-xl border px-3 py-2.5 text-left text-sm font-semibold ${s === p.status ? "border-moss bg-moss text-white" : "border-line"}`}>
                  {s === "Complete" ? "✅ " : ""}{s}{s === p.status ? " ✓" : ""}
                </button>
              ))}
            </div>
            <button type="button" onClick={() => setStatusOpen(false)} className="mt-3 w-full rounded-full border border-line px-4 py-2.5 font-semibold">Cancel</button>
          </div>
        </div>
      )}

      {confirming && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center" onClick={() => !busy && setConfirming(false)}
          onKeyDown={(e) => { if (e.key === "Escape" && !busy) setConfirming(false); }}>
          <div role="alertdialog" aria-modal="true" aria-labelledby={`del-${p.id}`} className="card w-full max-w-sm space-y-3 p-5" onClick={(e) => e.stopPropagation()}>
            <h2 id={`del-${p.id}`} className="text-lg">Are you sure?</h2>
            <p className="text-sm text-muted">“{p.title}” will move to Recently deleted. You can undo right away, or restore it there for 30 days.</p>
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
