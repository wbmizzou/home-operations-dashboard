"use client";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { STATUSES } from "@/lib/constants";
import { priorityName, type PriorityLevel } from "@/lib/priorities";
import { SlidersHorizontal, User, X } from "lucide-react";

export const SORTS = [
  { value: "status", label: "Status" },
  { value: "folder", label: "Folder" },
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

export default function FilterBar({ categories, me, owners, priorities, statuses }: { categories: { id: string; name: string }[]; me: string | null; owners: string[]; priorities: PriorityLevel[]; statuses?: string[] }) {
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
    { key: "priority", title: "Priority", options: priorities.map((p) => ({ value: String(p.value), label: priorityName(p) })) },
    { key: "category", title: "Category", options: [...categories.map((c) => ({ value: c.id, label: c.name })), { value: "none", label: "Uncategorized" }] },
    { key: "owner", title: "Owner", options: [...owners.map((o) => ({ value: o, label: o })), { value: "none", label: "Unassigned" }] },
    { key: "season", title: "Season", options: SEASONS.map((s) => ({ value: s, label: s })) },
    { key: "status", title: "Status", options: (statuses ?? [...STATUSES]).map((s) => ({ value: s, label: s })) },
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
          className="btn-quiet shrink-0 whitespace-nowrap">
          <SlidersHorizontal size={16} strokeWidth={1.75} aria-hidden />Filters{applied.length > 0 && <span className="text-xs tabular-nums text-muted">{applied.length}</span>}
        </button>
        {me && (
          <button type="button" aria-pressed={params.get("mine") === "1"}
            onClick={() => update((sp) => { if (sp.get("mine") === "1") sp.delete("mine"); else sp.set("mine", "1"); })}
            className="chip !h-10 shrink-0 whitespace-nowrap">
            <User size={16} strokeWidth={1.75} aria-hidden />Mine
          </button>
        )}
        <label className="ml-auto flex min-w-0 items-center gap-2 text-sm text-muted">
          <span className="hidden sm:inline">Sort</span>
          <select aria-label="Sort by" value={sort} onChange={(e) => update((sp) => { if (e.target.value === "status") sp.delete("sort"); else sp.set("sort", e.target.value); })}
            className="input !w-auto min-w-0 !py-2 !text-sm">
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
                <legend className="mb-2 text-sm text-muted">{g.title}</legend>
                <div className="flex flex-wrap gap-2">
                  {g.options.map((o) => {
                    const on = sel.includes(o.value);
                    return (
                      <button type="button" key={o.value} aria-pressed={on} onClick={() => toggle(g.key, o.value)}
                        className="chip">{o.label}</button>
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
              className="chip chip-on !h-7 !text-xs" aria-label={`Remove filter ${a.label}`}>
              {a.label}<X size={14} strokeWidth={1.75} aria-hidden />
            </button>
          ))}
          <button type="button" onClick={() => update((sp) => { for (const g of groups) sp.delete(g.key); sp.delete("open"); sp.delete("mine"); })} className="px-1 text-xs text-muted underline">Clear filters</button>
        </div>
      )}
    </div>
  );
}
