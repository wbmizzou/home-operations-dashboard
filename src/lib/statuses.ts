import { STATUSES, STATUS_SORT_ORDER } from "@/lib/constants";

/** One of the household's statuses. Built-ins can't be renamed or removed. */
export type StatusDef = { name: string; position: number; builtin: boolean };

export const BUILTIN_STATUSES: StatusDef[] = STATUSES.map((name, i) => ({ name, position: (i + 1) * 100, builtin: true }));

/** Where a new status added from the project form goes: after Waiting, before Recurring. */
export const FORM_STATUS_POSITION = 850;

const byPosition = (a: StatusDef, b: StatusDef) => a.position - b.position || a.name.localeCompare(b.name);

/** Rank for sorting the project list by status (work in motion first). A custom status sits just after the built-in before it. */
export function statusRanker(statuses: StatusDef[]) {
  const ordered = [...statuses].sort(byPosition);
  const rank = new Map<string, number>();
  let anchor = 0;
  ordered.forEach((s, i) => {
    if (s.builtin) {
      const r = STATUS_SORT_ORDER.indexOf(s.name as (typeof STATUS_SORT_ORDER)[number]);
      anchor = r === -1 ? 50 : r;
      rank.set(s.name, anchor);
    } else rank.set(s.name, anchor + 0.5 + i / 1000);
  });
  return (name: string) => rank.get(name) ?? 99;
}

/** Stages for the "path so far" bar: everything except Recurring and Complete, in lifecycle order. */
export const pipelineStages = (statuses: StatusDef[]) =>
  [...statuses].sort(byPosition).filter((s) => s.name !== "Recurring" && s.name !== "Complete").map((s) => s.name);

/** Statuses in lifecycle order, as names. */
export const statusNames = (statuses: StatusDef[]) => [...statuses].sort(byPosition).map((s) => s.name);

/** A position between `after` and the next status, for inserting a custom status. */
export function positionAfter(statuses: StatusDef[], afterName: string) {
  const ordered = [...statuses].sort(byPosition);
  const i = ordered.findIndex((s) => s.name === afterName);
  if (i === -1) return FORM_STATUS_POSITION;
  const here = ordered[i].position;
  const next = ordered[i + 1]?.position ?? here + 100;
  return next - here > 1 ? Math.floor((here + next) / 2) : here;
}
