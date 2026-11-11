"use client";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { OWNERS, PRIORITIES, STATUSES } from "@/lib/constants";

export const SORTS = [
  { value: "status", label: "Status" },
  { value: "priority", label: "Priority" },
  { value: "target", label: "Target date" },
  { value: "newest", label: "Newest first" },
  { value: "updated", label: "Recently updated" },
  { value: "name", label: "Name A–Z" },
] as const;

const SEASONS = ["Spring", "Summer", "Fall", "Winter"];
const list = (v: string | null) => (v ? v.split(",").filter(Boolean) : []);

// The list's sort and filters are remembered per device (not the search text).
const VIEW_KEY = "hh-projects-view";
const readView = () => { try { return localStorage.getItem(VIEW_KEY) ?? ""; } catch { return ""; } };
const writeView = (v: string) => { try { localStorage.setItem(VIEW_KEY, v); } catch {} };
const viewOf = (params: URLSearchParams) => { const sp = new URLSearchParams(params.toString()); sp.delete("q"); return sp.toString(); };

/** "Clear all": also forgets the remembered view, so the default list comes back. */
export function ClearAllLink() {
  const router = useRouter();
  return (
    <button type="button" onClick={() => { writeView(""); router.replace("/projects", { scroll: false }); }}
      className="shrink-0 text-sm text-moss underline">Clear all</button>
  );
}

type Group = { key: string; title: string; options: { value: string; label: string }[] };

export default function FilterBar({ categories, me }: { categories: { id: string; name: string }[]; me: string | null }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [open, setOpen] = useState(false);

  // Restore the last view when the list is opened plain; afterwards keep it up to date.
  const first = useRef(true);
  useEffect(() => {
    if (first.current) {
      first.current = false;
      const saved = readView();
      if (!params.toString() && saved) { router.replace(`${pathname}?${saved}`, { scroll: false }); return; }
    }
    writeView(viewOf(new URLSearchParams(params.toString())));
  }, [params, pathname, router]);

  const groups: Group[] = [
    { key: "priority", title: "Priority", options: PRIORITIES.map((p) => ({ value: String(p.value), label: `${p.label} · ${p.focus}` })) },
    { key: "category", title: "Category", options: [...categories.map((c) => ({ value: c.id, label: c.name })), { value: "none", label: "Uncategorized" }] },
    { key: "owner", title: "Owner", options: [...OWNERS.map((o) => ({ value: o, label: o })), { value: "none", label: "Unassigned" }] },
    { key: "season", title: "Season", options: SEASONS.map((s) => ({ value: s, label: s })) },
    { key: "status", title: "Status", options: STATUSES.map((s) => ({ value: s, label: s })) },
  ];

  function update(mutate: (sp: URLSearchParams) => void) {
    const sp = new URLSearchParams(params.toString());
    mutate(sp);
    router.replace(`${pathname}${sp.size ? `?${sp}` : ""}`, { scroll: false });
  }
  function toggle(key: string, value: string) {
    update((sp) => {
      const cur = list(sp.get(key));
      const next = cur.includes(value) ? cur.filter((x) => x !== value) : [...cur, value];
      if (next.length) sp.set(key, next.join(",")); else sp.delete(key);
    });
  }

  const applied = [
    ...groups.flatMap((g) => list(params.get(g.key)).map((v) => ({ key: g.key, value: v, label: g.options.find((o) => o.value === v)?.label.split(" · ")[0] ?? v }))),
    ...(params.get("open") === "0" ? [{ key: "open", value: "0", label: "Including completed" }] : []),
    ...(params.get("mine") === "1" && me ? [{ key: "mine", value: "1", label: `Mine (${me} + Joint)` }] : []),
  ];
  const sort = params.get("sort") ?? "status";
  const openOnly = params.get("open") !== "0" && !list(params.get("status")).includes("Complete");

  return (
    <div className="mt-3">
      <div className="flex gap-2">
        <button type="button" onClick={() => setOpen(!open)} aria-expanded={open}
          className="card flex shrink-0 items-center gap-2 whitespace-nowrap !rounded-full px-4 py-2 text-sm font-semibold">
          🧺 Filters{applied.length > 0 && <span className="rounded-full bg-moss px-2 text-xs text-white">{applied.length}</span>}
        </button>
        {me && (
          <button type="button" aria-pressed={params.get("mine") === "1"}
            onClick={() => update((sp) => { if (sp.get("mine") === "1") sp.delete("mine"); else sp.set("mine", "1"); })}
            className={`shrink-0 whitespace-nowrap rounded-full border px-4 py-2 text-sm font-semibold ${params.get("mine") === "1" ? "border-moss bg-moss text-white" : "border-line text-muted"}`}>
            👤 Mine
          </button>
        )}
        <label className="ml-auto flex min-w-0 items-center gap-2 text-sm text-muted">
          <span className="hidden sm:inline">Sort</span>
          <select aria-label="Sort by" value={sort} onChange={(e) => update((sp) => { if (e.target.value === "status") sp.delete("sort"); else sp.set("sort", e.target.value); })}
            className="input !w-auto min-w-0 !rounded-full !py-2 !text-sm">
            {SORTS.map((s) => <option key={s.value} value={s.value}>{`Sort: ${s.label}`}</option>)}
          </select>
        </label>
      </div>

      {open && (
        <div className="card mt-3 space-y-4 p-4">
          {groups.map((g) => {
            const sel = list(params.get(g.key));
            return (
              <fieldset key={g.key}>
                <legend className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-muted">{g.title}</legend>
                <div className="flex flex-wrap gap-2">
                  {g.options.map((o) => {
                    const on = sel.includes(o.value);
                    return (
                      <button type="button" key={o.value} aria-pressed={on} onClick={() => toggle(g.key, o.value)}
                        className={`rounded-full border px-3 py-1.5 text-sm ${on ? "border-moss bg-moss text-white" : "border-line text-muted hover:text-ink"}`}>{o.label}</button>
                    );
                  })}
                </div>
              </fieldset>
            );
          })}
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={openOnly} onChange={(e) => update((sp) => {
              if (e.target.checked) {
                sp.delete("open");
                const rest = list(sp.get("status")).filter((x) => x !== "Complete");
                if (rest.length) sp.set("status", rest.join(",")); else sp.delete("status");
              } else sp.set("open", "0");
            })} />
            Open projects only (hide Complete)
          </label>
        </div>
      )}

      {applied.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-2">
          {applied.map((a) => (
            <button key={`${a.key}-${a.value}`} type="button" onClick={() => (a.key === "open" || a.key === "mine" ? update((sp) => sp.delete(a.key)) : toggle(a.key, a.value))}
              className="rounded-full bg-moss/15 px-3 py-1 text-xs font-semibold text-moss" aria-label={`Remove filter ${a.label}`}>
              {a.label} ✕
            </button>
          ))}
          <button type="button" onClick={() => update((sp) => { for (const g of groups) sp.delete(g.key); sp.delete("open"); sp.delete("mine"); })} className="px-1 text-xs text-muted underline">Clear filters</button>
        </div>
      )}
    </div>
  );
}
