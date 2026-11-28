"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { STATUSES, money } from "@/lib/constants";
import { priorityTone } from "@/lib/priorities";
import { softDeleteProject } from "@/lib/projectActions";
import { toast } from "@/lib/toast";
import { friendlyError } from "@/lib/errors";
import { useBulk } from "@/components/BulkSelect";
import { Check, ChevronDown, Trash2 } from "lucide-react";

export type ListProject = {
  id: string;
  title: string;
  categoryName: string | null;
  status: string;
  completedOn: string | null;
  owner: string | null;
  priority: number;
  priorityLabel: string;
  when: string | null;
  cost: number | null;
  /** Overdue / due-soon tag, computed on the server (target date, or next service for recurring work). */
  due: { kind: "overdue" | "soon"; date: string } | null;
  /** Title of an unfinished project this one is waiting on. */
  blockedBy: string | null;
  /** The folder it is in, shown as a small colored tag. */
  folder?: { name: string; color: string } | null;
};

const REVEAL = 96; // px of the red Delete button
const today = () => new Date().toISOString().slice(0, 10);
const short = (d: string) => new Date(d + "T00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" });

/** A project row: tap the status to change it; swipe left to reveal Delete (with Undo afterwards). */
export default function ProjectListItem({ p, statuses = [...STATUSES] }: { p: ListProject; statuses?: string[] }) {
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
  const bulk = useBulk();

  // Tapping anywhere else closes an open row.
  useEffect(() => {
    if (offset === 0) return;
    const close = (e: PointerEvent) => { if (!rowRef.current?.contains(e.target as Node)) setOffset(0); };
    document.addEventListener("pointerdown", close);
    return () => document.removeEventListener("pointerdown", close);
  }, [offset]);

  // Select mode: the whole row is a checkbox (no swipe, no opening the project).
  if (bulk?.selecting) {
    const on = bulk.selected.has(p.id);
    return (
      <li className={on ? "bg-moss/10" : "bg-surface"}>
        <label className="flex cursor-pointer items-center gap-3 px-4 py-3">
          <input type="checkbox" checked={on} onChange={() => bulk.toggle(p.id)} className="h-6 w-6 shrink-0 accent-[var(--moss)]" />
          <span className="min-w-0 flex-1">
            <span className="block truncate font-medium">{p.title}</span>
            <span className="block truncate text-xs text-muted">
              {p.folder ? `${p.folder.name} · ` : ""}{p.categoryName ?? "Uncategorized"} · {p.owner ?? "Unassigned"}
            </span>
          </span>
          <span className="shrink-0 text-right">
            <span className={`block text-sm font-semibold ${priorityTone(p.priority)}`}>{p.priorityLabel}</span>
            <span className="block text-[11px] text-muted">{p.status}</span>
          </span>
        </label>
      </li>
    );
  }

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
    if (error) { toast(`Couldn't change status: ${friendlyError(error)}`); return; }
    router.refresh();
    const undo = { label: "Undo", run: async () => { await createClient().from("projects").update(prev).eq("id", p.id); router.refresh(); toast("Status restored"); } };
    if (next === "Complete") {
      toast(`“${p.title}” complete — add the final cost?`, { label: "Add cost", run: () => router.push(`/projects/${p.id}`) });
    } else toast(`Moved to ${next}`, undo);
  }

  const label = p.priorityLabel;

  return (
    <li ref={rowRef} className="relative overflow-hidden">
      <button type="button" onClick={() => setConfirming(true)} tabIndex={offset === 0 ? -1 : 0} aria-hidden={offset === 0}
        className="absolute inset-y-0 right-0 flex items-center justify-center gap-1.5 bg-berry text-sm font-medium text-white"
        style={{ width: REVEAL }}>
        <Trash2 size={16} strokeWidth={1.5} aria-hidden />Delete
      </button>

      <div onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={onPointerUp} onPointerCancel={onPointerUp}
        className="relative flex items-center gap-3 bg-surface pr-4" style={{ transform: `translateX(${offset}px)`, transition: dragging ? "none" : "transform 200ms cubic-bezier(0.22, 1, 0.36, 1)", touchAction: "pan-y" }}>
        <Link href={`/projects/${p.id}`} draggable={false}
          onClick={(e) => { if (moved.current) { e.preventDefault(); moved.current = false; } else if (offset !== 0) { e.preventDefault(); setOffset(0); } }}
          className="min-w-0 flex-1 py-3 pl-4">
          <div className="truncate font-medium">{p.title}</div>
          <div className="mt-0.5 truncate text-xs text-muted">
            {p.folder && <><span aria-hidden="true" className="mr-1.5 inline-block h-2 w-2 rounded-full align-[0px]" style={{ background: p.folder.color }} />{p.folder.name} · </>}
            {p.categoryName ?? "Uncategorized"} · {p.owner ?? "Unassigned"}{p.when ? ` · ${p.when}` : ""}
          </div>
          {(p.due || p.blockedBy) && (
            <div className="mt-1 flex flex-wrap gap-1.5">
              {p.due && (
                <span className="rounded-md px-1.5 py-0.5 text-xs font-medium tabular-nums"
                  style={p.due.kind === "overdue"
                    ? { background: "color-mix(in srgb, var(--berry) 18%, transparent)", color: "var(--berry)" }
                    : { background: "color-mix(in srgb, var(--gold) 22%, transparent)", color: "var(--bark)" }}>
                  {p.due.kind === "overdue" ? `Overdue · ${short(p.due.date)}` : `Due ${short(p.due.date)}`}
                </span>
              )}
              {p.blockedBy && (
                <span className="truncate rounded-md bg-raised px-1.5 py-0.5 text-xs text-muted">Waiting on {p.blockedBy}</span>
              )}
            </div>
          )}
        </Link>
        <div className="flex shrink-0 flex-col items-end gap-1 py-2">
          <div className={`text-sm font-medium ${priorityTone(p.priority)}`}>{label}</div>
          <button type="button" onClick={() => { if (!moved.current && offset === 0) setStatusOpen(true); }}
            aria-label={`Status: ${p.status}. Tap to change.`}
            className="inline-flex h-7 items-center gap-1 rounded-md border border-line px-2 text-xs text-muted transition-[background-color,transform] duration-150 hover:bg-raised active:scale-[.97]">
            {p.status}<ChevronDown size={14} strokeWidth={1.5} aria-hidden />
          </button>
          {p.cost != null && <div className="text-xs tabular-nums text-muted">{money(p.cost)}</div>}
        </div>
      </div>

      {statusOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center" onClick={() => setStatusOpen(false)}
          onKeyDown={(e) => { if (e.key === "Escape") setStatusOpen(false); }}>
          <div role="dialog" aria-modal="true" aria-labelledby={`st-${p.id}`} className="card w-full max-w-sm p-4" onClick={(e) => e.stopPropagation()}>
            <h2 id={`st-${p.id}`} className="truncate px-1 text-lg">Move “{p.title}” to…</h2>
            <div className="mt-3 grid grid-cols-2 gap-2">
              {statuses.map((s) => (
                <button key={s} type="button" onClick={() => changeStatus(s)} autoFocus={s === p.status}
                  className={`flex items-center justify-between gap-2 rounded-lg border px-3 py-2.5 text-left text-sm transition-colors duration-150 ${s === p.status ? "border-moss bg-moss font-medium text-[var(--on-accent)]" : "border-line hover:bg-raised"}`}>
                  {s}{s === p.status && <Check size={16} strokeWidth={1.75} aria-hidden />}
                </button>
              ))}
            </div>
            <button type="button" onClick={() => setStatusOpen(false)} className="btn-quiet mt-3 w-full">Cancel</button>
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
                className="btn-quiet min-h-11 flex-1">Cancel</button>
              <button type="button" onClick={remove} disabled={busy}
                className="flex-1 rounded-full bg-berry px-4 py-3 font-medium text-white">{busy ? "Deleting…" : "Yes, delete"}</button>
            </div>
          </div>
        </div>
      )}
    </li>
  );
}
