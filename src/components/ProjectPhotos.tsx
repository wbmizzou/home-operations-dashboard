"use client";
/* eslint-disable @next/next/no-img-element -- photos come from short-lived signed storage links */
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { toast } from "@/lib/toast";
import { friendlyError } from "@/lib/errors";
import { PHOTO_BUCKET as BUCKET, thumbPath } from "@/lib/photos";
import { Trash2, X } from "lucide-react";

export type Photo = { id: string; path: string; caption: string | null; created_at: string; by: string | null; url: string | null; thumb: string | null };

const FULL = 1600; // longest side, px
const THUMB = 400;

/** Resize on the phone and re-encode as JPEG (which also drops hidden location data). */
async function shrink(file: File, max: number, quality: number): Promise<Blob> {
  const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  const scale = Math.min(1, max / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  return new Promise((resolve, reject) => canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("Couldn't read that photo"))), "image/jpeg", quality));
}

type Upload = { name: string; state: "Shrinking…" | "Uploading…" | "Added" | "Failed"; pct: number };

/** Photos card at the top of a project: add from the camera roll, see thumbnails, open one full screen. */
export default function ProjectPhotos({ projectId, householdId, photos }: { projectId: string; householdId: string; photos: Photo[] }) {
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const [uploads, setUploads] = useState<Upload[] | null>(null);
  const [open, setOpen] = useState<number | null>(null);

  async function add(files: FileList | null) {
    if (!files?.length) return;
    const list = [...files];
    setUploads(list.map((f) => ({ name: f.name.replace(/\.[^.]+$/, ""), state: "Shrinking…", pct: 10 })));
    const supabase = createClient();
    const set = (i: number, u: Partial<Upload>) => setUploads((all) => all && all.map((x, j) => (j === i ? { ...x, ...u } : x)));
    let added = 0;
    for (const [i, file] of list.entries()) {
      try {
        const [full, thumb] = await Promise.all([shrink(file, FULL, 0.82), shrink(file, THUMB, 0.75)]);
        set(i, { state: "Uploading…", pct: 50 });
        const path = `${householdId}/${projectId}/${crypto.randomUUID()}.jpg`;
        const up = await supabase.storage.from(BUCKET).upload(path, full, { contentType: "image/jpeg" });
        if (up.error) throw up.error;
        const upT = await supabase.storage.from(BUCKET).upload(thumbPath(path), thumb, { contentType: "image/jpeg" });
        if (upT.error) throw upT.error;
        const { error } = await supabase.from("project_photos").insert({ project_id: projectId, path });
        if (error) { await supabase.storage.from(BUCKET).remove([path, thumbPath(path)]); throw error; }
        set(i, { state: "Added", pct: 100 }); added++;
      } catch (e) {
        set(i, { state: "Failed", pct: 100 });
        toast(`Couldn't add ${file.name}: ${friendlyError(e as { message: string })}`);
      }
    }
    if (input.current) input.current.value = "";
    if (added) router.refresh();
  }

  const busy = uploads?.some((u) => u.state === "Shrinking…" || u.state === "Uploading…");

  return (
    <section className="card mt-4 p-4" aria-label="Photos">
      <input ref={input} type="file" accept="image/*" multiple hidden onChange={(e) => add(e.target.files)} />
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-lg">Photos {photos.length > 0 && <span className="text-sm font-semibold text-muted">{photos.length}</span>}</h2>
        <button type="button" onClick={() => input.current?.click()} disabled={busy}
          className="btn inline-flex !px-4 !py-2 text-sm">{busy ? "Adding…" : "Add photos"}</button>
      </div>
      {photos.length > 0 ? (
        <>
          <ul className="mt-3 grid grid-cols-3 gap-1.5 sm:grid-cols-4">
            {photos.map((p, i) => (
              <li key={p.id}>
                <button type="button" onClick={() => setOpen(i)} aria-label={p.caption ? `Open photo: ${p.caption}` : `Open photo ${i + 1}`}
                  className="relative block aspect-square w-full overflow-hidden rounded-2xl bg-line">
                  {p.thumb && <img src={p.thumb} alt="" loading="lazy" className="h-full w-full object-cover" />}
                  {p.caption && <span className="absolute inset-x-1.5 bottom-1.5 truncate rounded-lg bg-surface/85 px-1.5 py-0.5 text-left text-[10px] font-semibold text-ink">{p.caption}</span>}
                </button>
              </li>
            ))}
          </ul>
          <p className="mt-2 text-xs text-muted">Before &amp; after shots, receipts for the home record. Please don&apos;t add IDs or bank documents.</p>
        </>
      ) : (
        <p className="mt-1 text-sm text-muted">Before &amp; after shots, receipts, quotes. Pick from your camera roll or take one now.</p>
      )}

      {uploads && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center">
          <div role="dialog" aria-modal="true" aria-labelledby="up-title" className="card w-full max-w-sm space-y-3 p-5">
            <h2 id="up-title" className="text-lg">Adding {uploads.length} photo{uploads.length === 1 ? "" : "s"}</h2>
            <ul className="space-y-3" aria-live="polite">
              {uploads.map((u, i) => (
                <li key={i} className="space-y-1.5">
                  <div className="flex justify-between gap-3 text-sm"><span className="truncate font-semibold">{u.name}</span>
                    <span className={u.state === "Failed" ? "text-berry" : "text-muted"}>{u.state}</span></div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-line"><div className={`h-full rounded-full transition-all ${u.state === "Failed" ? "bg-berry" : "bg-moss"}`} style={{ width: `${u.pct}%` }} /></div>
                </li>
              ))}
            </ul>
            <p className="text-xs text-muted">Shrunk to about 300 KB each, with location data removed, before upload.</p>
            <button type="button" onClick={() => setUploads(null)} disabled={busy} className="btn-quiet min-h-11 w-full">
              {busy ? "Working…" : "Done"}</button>
          </div>
        </div>
      )}

      {open !== null && photos[open] && (
        <Viewer photos={photos} index={open} onIndex={setOpen} onClose={() => setOpen(null)} />
      )}
    </section>
  );
}

function Viewer({ photos, index, onIndex, onClose }: { photos: Photo[]; index: number; onIndex: (i: number) => void; onClose: () => void }) {
  const router = useRouter();
  const p = photos[index];
  const [caption, setCaption] = useState(p.caption ?? "");
  const [busy, setBusy] = useState(false);
  const startX = useRef<number | null>(null);
  const go = (d: number) => { const n = index + d; if (n >= 0 && n < photos.length) { onIndex(n); setCaption(photos[n].caption ?? ""); } };

  useEffect(() => {
    const key = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", key);
    return () => document.removeEventListener("keydown", key);
  }, [onClose]);

  async function saveCaption() {
    const next = caption.trim() || null;
    if (next === (p.caption ?? null)) return;
    const { error } = await createClient().from("project_photos").update({ caption: next }).eq("id", p.id);
    if (error) return toast(`Couldn't save caption: ${friendlyError(error)}`);
    toast("Caption saved"); router.refresh();
  }

  async function remove() {
    if (!window.confirm("Delete this photo? This can't be undone.")) return;
    setBusy(true);
    const supabase = createClient();
    const { error } = await supabase.from("project_photos").delete().eq("id", p.id);
    if (!error) await supabase.storage.from(BUCKET).remove([p.path, thumbPath(p.path)]);
    setBusy(false);
    if (error) return toast(`Couldn't delete: ${friendlyError(error)}`);
    toast("Photo deleted");
    onClose(); router.refresh();
  }

  return (
    <div role="dialog" aria-modal="true" aria-label="Photo" className="fixed inset-0 z-50 flex flex-col gap-3 bg-[#161513] p-4 pt-[max(1rem,env(safe-area-inset-top))] text-[#efe9de]">
      <div className="flex items-center justify-between">
        <button type="button" onClick={onClose} aria-label="Close" className="flex h-11 w-11 items-center justify-center rounded-full bg-white/10"><X size={20} strokeWidth={1.5} aria-hidden /></button>
        <span className="text-sm text-[#aaa398]">{index + 1} of {photos.length}</span>
        <button type="button" onClick={remove} disabled={busy} aria-label="Delete photo" className="flex h-11 w-11 items-center justify-center rounded-full bg-[#e5788a]/15 text-[#e5788a]"><Trash2 size={20} strokeWidth={1.5} aria-hidden /></button>
      </div>
      <div className="relative flex min-h-0 flex-1 items-center justify-center"
        onTouchStart={(e) => { startX.current = e.touches[0].clientX; }}
        onTouchEnd={(e) => { const s = startX.current; startX.current = null; if (s === null) return; const dx = e.changedTouches[0].clientX - s; if (Math.abs(dx) > 50) go(dx < 0 ? 1 : -1); }}>
        {p.url ? <img src={p.url} alt={p.caption ?? `Photo ${index + 1}`} className="max-h-full max-w-full rounded-2xl object-contain" />
          : <p className="text-sm text-[#aaa398]">This photo couldn&apos;t be loaded.</p>}
        {index > 0 && <button type="button" onClick={() => go(-1)} aria-label="Previous photo" className="absolute left-0 flex h-11 w-11 items-center justify-center rounded-full bg-black/40 text-xl">‹</button>}
        {index < photos.length - 1 && <button type="button" onClick={() => go(1)} aria-label="Next photo" className="absolute right-0 flex h-11 w-11 items-center justify-center rounded-full bg-black/40 text-xl">›</button>}
      </div>
      <label className="block text-sm text-[#aaa398]">Caption
        <input value={caption} maxLength={120} onChange={(e) => setCaption(e.target.value)} onBlur={saveCaption}
          onKeyDown={(e) => { if (e.key === "Enter") (e.target as HTMLInputElement).blur(); }} placeholder="Add a caption"
          className="mt-1 w-full rounded-[0.85rem] border border-[#2e4235] bg-[#1d2d24] px-3.5 py-3 text-base text-[#efe9de]" />
      </label>
      <p className="pb-[env(safe-area-inset-bottom)] text-xs text-[#aaa398]">
        Added{p.by ? ` by ${p.by}` : ""} · {new Date(p.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
      </p>
    </div>
  );
}
