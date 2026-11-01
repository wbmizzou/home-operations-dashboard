"use client";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { OWNERS, PRIORITIES, STATUSES } from "@/lib/constants";

export const SORTS = [
  { value: "priority", label: "Priority" },
  { value: "target", label: "Target date" },
  { value: "newest", label: "Newest first" },
  { value: "updated", label: "Recently updated" },
  { value: "name", label: "Name A–Z" },
] as const;

const SEASONS = ["Spring", "Summer", "Fall", "Winter"];
const list = (v: string | null) => (v ? v.split(",").filter(Boolean) : []);

type Group = { key: string; title: string; options: { value: string; label: string }[] };

export default function FilterBar({ categories }: { categories: { id: string; name: string }[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [open, setOpen] = useState(false);

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
    ...(params.get("open") ? [{ key: "open", value: "1", label: "Open only" }] : []),
  ];
  const sort = params.get("sort") ?? "priority";

  return (
    <div className="mt-3">
      <div className="flex gap-2">
        <button type="button" onClick={() => setOpen(!open)} aria-expanded={open}
          className="card flex items-center gap-2 !rounded-full px-4 py-2 text-sm font-semibold">
          🧺 Filters{applied.length > 0 && <span className="rounded-full bg-moss px-2 text-xs text-white">{applied.length}</span>}
        </button>
        <label className="ml-auto flex items-center gap-2 text-sm text-muted">
          Sort
          <select value={sort} onChange={(e) => update((sp) => { if (e.target.value === "priority") sp.delete("sort"); else sp.set("sort", e.target.value); })}
            className="input !w-auto !rounded-full !py-2 !text-sm">
            {SORTS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
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
            <input type="checkbox" checked={!!params.get("open")} onChange={(e) => update((sp) => { if (e.target.checked) sp.set("open", "1"); else sp.delete("open"); })} />
            Open projects only (hide Complete)
          </label>
        </div>
      )}

      {applied.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-2">
          {applied.map((a) => (
            <button key={`${a.key}-${a.value}`} type="button" onClick={() => (a.key === "open" ? update((sp) => sp.delete("open")) : toggle(a.key, a.value))}
              className="rounded-full bg-moss/15 px-3 py-1 text-xs font-semibold text-moss" aria-label={`Remove filter ${a.label}`}>
              {a.label} ✕
            </button>
          ))}
          <button type="button" onClick={() => update((sp) => { for (const g of groups) sp.delete(g.key); sp.delete("open"); })} className="px-1 text-xs text-muted underline">Clear filters</button>
        </div>
      )}
    </div>
  );
}
